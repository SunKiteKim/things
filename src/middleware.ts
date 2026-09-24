import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMIN_HOST, SITE_HOST } from "@/lib/site";

function hostname(request: NextRequest) {
  return request.headers.get("host")?.split(":")[0] ?? "";
}

function redirectToHost(request: NextRequest, host: string) {
  const url = new URL(request.url);
  url.hostname = host;
  url.protocol = "https:";
  url.port = "";
  return NextResponse.redirect(url, 308);
}

function productionHostRedirect(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") return null;
  const host = hostname(request);
  const { pathname } = request.nextUrl;
  const adminPath = pathname.startsWith("/admin");

  if (host === ADMIN_HOST) {
    if (adminPath || pathname === "/" || pathname === "/login" || pathname.startsWith("/api")) {
      return null;
    }
    return redirectToHost(request, SITE_HOST);
  }

  if (host === SITE_HOST) {
    if (!adminPath) return null;
    const url = new URL(request.url);
    url.hostname = ADMIN_HOST;
    url.protocol = "https:";
    url.port = "";
    if (pathname === "/admin") url.pathname = "/";
    if (pathname === "/admin/login") url.pathname = "/login";
    return NextResponse.redirect(url, 308);
  }

  return redirectToHost(request, adminPath ? ADMIN_HOST : SITE_HOST);
}

function adminInternalPath(pathname: string) {
  if (pathname === "/" || pathname === "") return "/admin";
  if (pathname === "/login") return "/admin/login";
  return pathname;
}

export async function middleware(request: NextRequest) {
  const hostRedirect = productionHostRedirect(request);
  if (hostRedirect) return hostRedirect;

  const host = hostname(request);
  const onAdminHost = process.env.VERCEL_ENV === "production" && host === ADMIN_HOST;
  const pathname = onAdminHost ? adminInternalPath(request.nextUrl.pathname) : request.nextUrl.pathname;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (token?.role === "ADMIN" && token.portal === "admin") {
        const home = onAdminHost ? new URL("/", request.url) : new URL("/admin", request.url);
        return NextResponse.redirect(home);
      }
      if (pathname !== request.nextUrl.pathname) {
        const url = request.nextUrl.clone();
        url.pathname = pathname;
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (token && ((token.portal ?? "shop") === "shop" || token.role !== "ADMIN")) {
      const shop = process.env.VERCEL_ENV === "production" ? `https://${SITE_HOST}/` : "/";
      return NextResponse.redirect(new URL(shop, request.url));
    }
    if (!token || token.role !== "ADMIN" || token.portal !== "admin") {
      const login = onAdminHost ? new URL("/login", request.url) : new URL("/admin/login", request.url);
      return NextResponse.redirect(login);
    }
  }

  if (pathname.startsWith("/mypage") || pathname.startsWith("/checkout")) {
    const shopUser = token && (token.portal ?? "shop") !== "admin" && token.role !== "ADMIN";
    if (!shopUser) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname !== request.nextUrl.pathname) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
