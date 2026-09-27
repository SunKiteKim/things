"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { submitAdminRecovery } from "@/actions/admin-recovery";
import { maskPersonalInfo } from "@/lib/utils";

export default function AdminRecoveryPage() {
  const [mode, setMode] = useState("account");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; reset: boolean } | null>(null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-md">
        <Logo href="/admin/login" className="text-[1.7rem]" />
        <p className="mt-2 text-[0.72rem] uppercase tracking-[0.28em] text-muted">Admin</p>
        <h1 className="mt-4 text-3xl">관리자 계정 복구</h1>
        <p className="mt-4 text-sm leading-6 text-muted">서버 운영자에게 발급받은 일회용 복구 코드를 입력하세요. 코드는 30분 동안 유효하며 한 번만 사용할 수 있습니다.</p>
        {result ? (
          <div className="mt-8 space-y-4" role="status">
            <p>{result.reset ? "비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요." : "관리자 계정을 확인했습니다."}</p>
            <p className="break-all font-medium">{maskPersonalInfo(result.email)}</p>
            {!result.reset && <p className="text-sm text-muted">비밀번호도 재설정하려면 새 복구 코드를 발급받으세요.</p>}
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            const data = new FormData(event.currentTarget);
            setPending(true); setError("");
            try {
              const response = await submitAdminRecovery(data);
              if (response.error) setError(response.error);
              else if ("email" in response && response.email) setResult({ email: response.email, reset: Boolean(response.reset) });
            } catch { setError("연결을 확인한 후 다시 시도하세요."); }
            finally { setPending(false); }
          }}>
            <fieldset disabled={pending} className="space-y-5">
              <legend className="sr-only">복구 방법</legend>
              <div className="flex gap-6 text-sm">
                <label><input type="radio" name="mode" value="account" checked={mode === "account"} onChange={() => { setMode("account"); setError(""); }} /> 계정 찾기</label>
                <label><input type="radio" name="mode" value="password" checked={mode === "password"} onChange={() => { setMode("password"); setError(""); }} /> 비밀번호 재설정</label>
              </div>
              <label className="block text-sm">일회용 복구 코드
                <input className="mt-2 w-full border border-line bg-transparent p-3" name="code" type="password" autoComplete="off" required minLength={64} maxLength={64} spellCheck={false} />
              </label>
              {mode === "password" && <>
                <label className="block text-sm">새 비밀번호
                  <input className="mt-2 w-full border border-line bg-transparent p-3" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} aria-describedby="password-help" />
                </label>
                <p id="password-help" className="text-xs text-muted">10~72자, 영문 대문자와 숫자를 포함하세요.</p>
                <label className="block text-sm">새 비밀번호 확인
                  <input className="mt-2 w-full border border-line bg-transparent p-3" name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
                </label>
              </>}
              {error && <p role="alert" className="text-sm text-accent">{error}</p>}
              <button className="btn w-full disabled:opacity-50" disabled={pending}>{pending ? "처리 중…" : mode === "account" ? "계정 확인" : "비밀번호 재설정"}</button>
            </fieldset>
          </form>
        )}
        <Link href="/admin/login" className="mt-6 block text-center text-sm underline">관리자 로그인으로 돌아가기</Link>
      </div>
    </main>
  );
}
