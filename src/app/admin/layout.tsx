import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login")) {
    return children;
  }

  const session = await requireAdmin();
  if (!session) redirect("/admin/login");

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <AdminNav />
      <div className="bg-paper px-8 py-10">{children}</div>
    </div>
  );
}
