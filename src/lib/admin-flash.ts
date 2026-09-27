import { cookies } from "next/headers";

export const ADMIN_FLASH_COOKIE = "things_admin_flash";

export async function setAdminFlash(message: string) {
  (await cookies()).set(ADMIN_FLASH_COOKIE, JSON.stringify({ id: crypto.randomUUID(), message }), {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60,
  });
}
