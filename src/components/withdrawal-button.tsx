"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { withdrawMember } from "@/actions/members";

export function WithdrawalButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function withdraw() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await withdrawMember({ email, phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("탈퇴 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost w-fit" onClick={() => setOpen(true)}>
        회원탈퇴
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 px-5" role="dialog" aria-modal="true" aria-labelledby="withdrawal-title">
          <div className="w-full max-w-md bg-white p-6 shadow-xl md:p-8">
            <h2 id="withdrawal-title" className="display text-2xl">회원탈퇴 확인</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              본인 확인을 위해 가입 ID와 휴대전화 번호를 입력해 주세요. 탈퇴 후 개인정보는 익명화되며,
              주문 기록은 보존됩니다. 같은 ID로 바로 다시 가입할 수 있습니다.
            </p>
            <div className="mt-6 space-y-3">
              <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ID (이메일)" autoComplete="username" />
              <input className="field" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="휴대전화 번호" autoComplete="tel" inputMode="tel" />
            </div>
            {error ? <p className="mt-3 text-sm text-accent" role="alert">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setError(""); }} disabled={pending}>취소</button>
              <button type="button" className="btn btn-accent" onClick={withdraw} disabled={pending || !email || !phone}>
                {pending ? "확인 중…" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
