"use client";

import { useEffect, useState } from "react";
import { checkSignupEmail, checkSignupPassword, registerMember } from "@/actions/auth";
import { FormField } from "@/components/form-field";
import { PostcodeAddress } from "@/components/postcode-address";

function Hint({ ok, children }: { ok?: boolean; children: string }) {
  return <p className={`mt-2 text-xs leading-5 ${ok ? "text-muted" : "text-accent"}`}>{children}</p>;
}

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailHint, setEmailHint] = useState<{ ok: boolean; message: string } | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [confirmHint, setConfirmHint] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!email) {
      setEmailHint(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setChecking(true);
      const result = await checkSignupEmail(email);
      setEmailHint({ ok: result.ok, message: result.message });
      setChecking(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!password && !confirm) {
      setPasswordHint(null);
      setConfirmHint(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      const result = await checkSignupPassword(password, confirm);
      setPasswordHint(result.password);
      setConfirmHint(confirm ? result.confirm : null);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [password, confirm]);

  const blocked = checking || emailHint?.ok === false || Boolean(passwordHint) || Boolean(confirmHint) || !email || !password || !confirm;

  return (
    <form
      action={registerMember}
      className="mt-10 grid gap-5"
      onSubmit={(event) => {
        if (blocked) event.preventDefault();
      }}
    >
      <FormField label="이름" htmlFor="signup-name">
        <input id="signup-name" className="field" name="name" required />
      </FormField>
      <FormField label="이메일" htmlFor="signup-email">
        <input
          id="signup-email"
          className="field"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {emailHint ? <Hint ok={emailHint.ok}>{emailHint.message}</Hint> : null}
      </FormField>
      <FormField label="휴대폰" htmlFor="signup-phone">
        <input id="signup-phone" className="field" name="phone" />
      </FormField>
      <FormField label="비밀번호" htmlFor="signup-password">
        <input
          id="signup-password"
          className="field"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="10~72자, 대문자·숫자 포함"
          required
        />
        {passwordHint ? <Hint>{passwordHint}</Hint> : null}
      </FormField>
      <FormField label="비밀번호 확인" htmlFor="signup-password-confirm">
        <input
          id="signup-password-confirm"
          className="field"
          name="passwordConfirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="비밀번호를 다시 입력하세요"
          required
        />
        {confirmHint ? <Hint>{confirmHint}</Hint> : null}
      </FormField>
      <PostcodeAddress />
      <div className="form-row">
        <span />
        <button className="btn w-full" disabled={blocked}>
          일반 회원가입
        </button>
      </div>
    </form>
  );
}
