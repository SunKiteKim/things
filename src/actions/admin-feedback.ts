"use server";

import { cookies } from "next/headers";
import { ADMIN_FLASH_COOKIE } from "@/lib/admin-flash";

export async function clearAdminFlash() {
  (await cookies()).set(ADMIN_FLASH_COOKIE, "", { path: "/admin", maxAge: 0 });
}
