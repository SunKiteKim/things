"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { OAuthButtons } from "@/components/oauth-buttons";
import { persistRememberedLogin, RememberLoginFields } from "@/components/remember-login-fields";
import { ADMIN_HOST, SITE_URL } from "@/lib/site";

type Portal = "shop" | "admin";

export function LoginPanel({ initialPortal = "shop" }: { initialPortal?: Portal }) {
  const params = useSearchParams();
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const callbackUrl = params.get("callbackUrl") || "/";
  const registered = params.get("registered");

  async function login(formData: FormData) {
    if (pending) return;
    setPending(true);
    setError("");
    persistRememberedLogin(portal, formData);

    try {
      const result = await signIn("credentials", {
        email: String(formData.get("email")),
        password: String(formData.get("password")),
        portal,
        redirect: false,
        callbackUrl: portal === "admin" ? "/admin" : callbackUrl,
      });

      if (!result?.ok) {
        setError(portal === "admin" ? "관리자 ID 또는 비밀번호를 확인해 주세요." : "ID 또는 비밀번호를 확인해 주세요.");
        return;
      }

      if (portal === "admin") {
        window.location.assign("/admin");
      } else if (window.location.hostname === ADMIN_HOST) {
        window.location.assign(`${SITE_URL}${callbackUrl.startsWith("/") ? callbackUrl : "/"}`);
      } else {
        window.location.assign(callbackUrl.startsWith("/") ? callbackUrl : "/");
      }
    } catch {
      setError("연결을 확인한 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[380px]">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">Account</p>
      <h1 className="display mt-2 text-[2.55rem] leading-none">로그인</h1>

      <div className="mt-9 grid grid-cols-2 rounded-full bg-[#f1f1ef] p-1" role="tablist" aria-label="로그인 유형">
        {(["shop", "admin"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={portal === item}
            className={`rounded-full px-4 py-2.5 text-sm transition ${portal === item ? "bg-white font-bold shadow-sm" : "text-muted"}`}
            onClick={() => {
              setPortal(item);
              setError("");
            }}
          >
            {item === "shop" ? "things" : "Admin"}
          </button>
        ))}
      </div>

      {registered && portal === "shop" ? <p className="mt-4 text-sm text-accent">가입이 완료되었습니다. 로그인하세요.</p> : null}
      {error ? <p className="mt-4 text-sm text-accent" role="alert">{error}</p> : null}

      <form className="mt-7 space-y-4" action={login}>
        <RememberLoginFields key={portal} portal={portal} />
        <button className="btn w-full" disabled={pending}>
          {pending ? "확인 중…" : portal === "admin" ? "Admin 로그인" : "이메일 로그인"}
        </button>
      </form>

      <Link
        href={portal === "admin" ? "/admin/login/recovery" : "/login/recovery"}
        className="mt-5 block text-center text-sm text-muted underline underline-offset-4"
      >
        {portal === "admin" ? "관리자 계정 복구" : "ID/PW 찾기"}
      </Link>

      {portal === "shop" ? (
        <>
          <div className="my-7 h-px bg-line" />
          <OAuthButtons />
          <p className="mt-7 text-center text-sm text-muted">
            계정이 없다면 <Link href="/signup" className="text-ink">회원가입</Link>
          </p>
        </>
      ) : (
        <p className="mt-7 text-center text-xs leading-5 text-muted">관리자 권한이 확인된 계정만 접속할 수 있습니다.</p>
      )}
    </div>
  );
}
