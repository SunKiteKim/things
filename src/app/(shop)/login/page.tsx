import { Suspense } from "react";
import { LoginPanel } from "@/components/login-panel";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-[520px] w-full max-w-[380px]" />}>
      <LoginPanel demoAdminEmail="admin@admin.com" demoAdminPassword="admin" />
    </Suspense>
  );
}
