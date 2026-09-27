import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export const metadata: Metadata = {
  title: { absolute: "things Admin" },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login")) {
    return children;
  }

  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-shell grid min-h-screen bg-[#f5f6f8] md:grid-cols-[232px_1fr]">
      <AdminNav />
      <main className="min-w-0 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
