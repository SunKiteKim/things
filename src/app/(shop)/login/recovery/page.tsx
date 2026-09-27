"use client";

import Link from "next/link";
import { useState } from "react";
import { submitMemberRecovery } from "@/actions/member-recovery";

type Mode = "account" | "password";

export default function MemberRecoveryPage() {
  const [mode, setMode] = useState<Mode>("account");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [reset, setReset] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setEmails([]);
    setReset(false);
  }

  return (
    <section className="mx-auto w-full max-w-[420px] py-4">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">Account</p>
      <h1 className="display mt-2 text-[2.25rem]">ID/PW 찾기</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        ID는 가입한 이메일입니다. 비밀번호는 본인정보 확인 후 새 비밀번호로 재설정됩니다.
      </p>

      <div className="mt-8 grid grid-cols-2 rounded-full bg-[#f1f1ef] p-1" role="tablist" aria-label="계정 찾기 유형">
        <button type="button" role="tab" aria-selected={mode === "account"} onClick={() => changeMode("account")} className={`rounded-full px-3 py-2.5 text-sm ${mode === "account" ? "bg-white font-bold shadow-sm" : "text-muted"}`}>ID 찾기</button>
        <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => changeMode("password")} className={`rounded-full px-3 py-2.5 text-sm ${mode === "password" ? "bg-white font-bold shadow-sm" : "text-muted"}`}>PW 찾기</button>
      </div>

      {emails.length ? (
        <div className="mt-7 border border-line p-5" role="status">
          <p className="text-sm text-muted">입력한 정보로 확인된 ID입니다.</p>
          {emails.map((email) => <p key={email} className="mt-2 break-all font-medium">{email}</p>)}
          <button type="button" className="mt-5 text-sm underline" onClick={() => changeMode("password")}>비밀번호 재설정하기</button>
        </div>
      ) : reset ? (
        <div className="mt-7 border border-line p-5" role="status">
          <p className="font-medium">비밀번호가 변경되었습니다.</p>
          <p className="mt-2 text-sm text-muted">새 비밀번호로 로그인해 주세요.</p>
        </div>
      ) : (
        <form className="mt-7 space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          setPending(true);
          setError("");
          try {
            const response = await submitMemberRecovery(new FormData(event.currentTarget));
            if (response.error) setError(response.error);
            else if ("emails" in response && response.emails) setEmails(response.emails);
            else if ("reset" in response && response.reset) setReset(true);
          } catch {
            setError("연결을 확인한 후 다시 시도해 주세요.");
          } finally {
            setPending(false);
          }
        }}>
          <input type="hidden" name="mode" value={mode} />
          {mode === "password" ? <input className="field" name="email" type="email" placeholder="ID (이메일)" autoComplete="username" required /> : null}
          <input className="field" name="name" placeholder="이름" autoComplete="name" required />
          <input className="field" name="phone" type="tel" placeholder="전화번호" autoComplete="tel" inputMode="tel" required />
          {mode === "password" ? (
            <>
              <input className="field" name="password" type="password" placeholder="새 비밀번호 (10~72자, 대문자·숫자 포함)" autoComplete="new-password" minLength={10} maxLength={72} required />
              <input className="field" name="confirm" type="password" placeholder="새 비밀번호 확인" autoComplete="new-password" minLength={10} maxLength={72} required />
            </>
          ) : null}
          {error ? <p className="text-sm text-accent" role="alert">{error}</p> : null}
          <button className="btn w-full" disabled={pending}>{pending ? "확인 중…" : mode === "account" ? "ID 찾기" : "비밀번호 재설정"}</button>
        </form>
      )}

      <Link href="/login" className="mt-7 block text-center text-sm underline underline-offset-4">로그인으로 돌아가기</Link>
    </section>
  );
}
