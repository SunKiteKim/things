import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (token?.role === "ADMIN" && token.portal === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (token && ((token.portal ?? "shop") === "shop" || token.role !== "ADMIN")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!token || token.role !== "ADMIN" || token.portal !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
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

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/mypage", "/mypage/:path*", "/checkout"],
};
