import { Suspense } from "react";
import { LoginPanel } from "@/components/login-panel";

export default function LoginPage() {
  const demoAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim() ?? "";
  const demoAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";

  return (
    <Suspense fallback={<div className="h-[520px] w-full max-w-[380px]" />}>
      <LoginPanel demoAdminEmail={demoAdminEmail} demoAdminPassword={demoAdminPassword} />
    </Suspense>
  );
}
