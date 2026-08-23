"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { OAuthButtons } from "@/components/oauth-buttons";
import { persistRememberedLogin, RememberLoginFields } from "@/components/remember-login-fields";

function LoginForm() {
  const params = useSearchParams();
  const registered = params.get("registered");
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

  return (
    <div className="mx-auto max-w-md">
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Account</p>
      <h1 className="display mt-3 text-5xl">로그인</h1>
      {registered ? (
        <p className="mt-4 text-sm text-accent">가입이 완료되었습니다. 로그인하세요.</p>
      ) : null}
      {error === "admin" ? (
        <p className="mt-4 text-sm text-accent">관리자 계정은 스토어에서 로그인할 수 없습니다.</p>
      ) : null}
      <form
        className="mt-10 space-y-4"
        action={async (formData) => {
          persistRememberedLogin("shop", formData);
          await signIn("credentials", {
            email: String(formData.get("email")),
            password: String(formData.get("password")),
            portal: "shop",
            callbackUrl,
          });
        }}
      >
        <RememberLoginFields portal="shop" />
        <button className="btn w-full">이메일 로그인</button>
      </form>
      <div className="my-8 h-px bg-line" />
      <OAuthButtons />
      <p className="mt-8 text-center text-sm text-muted">
        계정이 없다면 <Link href="/signup" className="text-ink">회원가입</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
