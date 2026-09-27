import { Suspense } from "react";
import { LoginPanel } from "@/components/login-panel";

export default function AdminLoginPage() {
  const demoAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim() ?? "";
  const demoAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <Suspense fallback={<div className="h-[520px] w-full max-w-[380px]" />}>
        <LoginPanel
          initialPortal="admin"
          demoAdminEmail={demoAdminEmail}
          demoAdminPassword={demoAdminPassword}
        />
      </Suspense>
    </main>
  );
}
