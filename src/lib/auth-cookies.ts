import { SITE_HOST } from "@/lib/site";

export function authUsesSecureCookie() {
  return process.env.NEXTAUTH_URL?.startsWith("https://") || !!process.env.VERCEL;
}

export function authCookieOptions() {
  const secure = authUsesSecureCookie();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    ...(process.env.VERCEL_ENV === "production" ? { domain: `.${SITE_HOST}` } : {}),
  };
}

function cookieName(portal: "shop" | "admin", key: string) {
  return `${authUsesSecureCookie() ? "__Secure-" : ""}things.${portal}.${key}`;
}

export function sessionCookieName(portal: "shop" | "admin") {
  return cookieName(portal, "session-token");
}

export function portalAuthCookies(portal: "shop" | "admin") {
  const options = authCookieOptions();
  return {
    sessionToken: { name: sessionCookieName(portal), options },
    callbackUrl: { name: cookieName(portal, "callback-url"), options },
    csrfToken: { name: cookieName(portal, "csrf-token"), options },
  };
}
