"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { persistRememberedLogin, RememberLoginFields } from "@/components/remember-login-fields";

export default function AdminLoginPage() {
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md">
        <Logo href="/admin/login" className="text-[1.7rem]" />
        <p className="mt-2 text-[0.72rem] uppercase tracking-[0.28em] text-muted">Admin</p>
        <h1 className="display mt-3 text-5xl">관리자 로그인</h1>
        {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
        <form
          className="mt-10 space-y-4"
          action={async (formData) => {
            persistRememberedLogin("admin", formData);
            const result = await signIn("credentials", {
              email: String(formData.get("email")),
              password: String(formData.get("password")),
              portal: "admin",
              redirect: false,
              callbackUrl: "/admin",
            });
            if (!result?.ok) {
              setError("관리자 계정만 로그인할 수 있습니다.");
              return;
            }
            window.location.href = "/admin";
          }}
        >
          <RememberLoginFields portal="admin" />
          <button className="btn w-full">로그인</button>
        </form>
      </div>
    </div>
  );
}
