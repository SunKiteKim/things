import { Suspense } from "react";
import { LoginPanel } from "@/components/login-panel";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <Suspense fallback={<div className="h-[520px] w-full max-w-[380px]" />}>
        <LoginPanel
          initialPortal="admin"
          demoAdminEmail="admin@admin.com"
          demoAdminPassword="admin"
        />
      </Suspense>
    </main>
  );
}
