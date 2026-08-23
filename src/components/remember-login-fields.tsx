"use client";

import { useEffect, useState } from "react";

type SavedLogin = { email: string; password: string };

function storageKey(portal: "shop" | "admin") {
  return `things.remember-login.${portal}`;
}

function readSaved(portal: "shop" | "admin"): SavedLogin | null {
  try {
    const raw = localStorage.getItem(storageKey(portal));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLogin;
    if (typeof parsed.email !== "string" || typeof parsed.password !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistRememberedLogin(portal: "shop" | "admin", formData: FormData) {
  const remember = formData.get("remember") === "on";
  const key = storageKey(portal);
  if (!remember) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(
    key,
    JSON.stringify({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    }),
  );
}

export function RememberLoginFields({ portal }: { portal: "shop" | "admin" }) {
  const [hydrated, setHydrated] = useState(false);
  const [remember, setRemember] = useState(false);
  const [saved, setSaved] = useState<SavedLogin>({ email: "", password: "" });

  useEffect(() => {
    const next = readSaved(portal);
    if (next) {
      setSaved(next);
      setRemember(true);
    }
    setHydrated(true);
  }, [portal]);

  return (
    <div key={hydrated ? "ready" : "pending"} className="space-y-4">
      <input
        className="field"
        name="email"
        type="email"
        placeholder="이메일"
        defaultValue={saved.email}
        autoComplete="username"
        required
      />
      <input
        className="field"
        name="password"
        type="password"
        placeholder="비밀번호"
        defaultValue={saved.password}
        autoComplete={remember ? "current-password" : "off"}
        required
      />
      <label className="remember-check">
        <input
          type="checkbox"
          name="remember"
          value="on"
          checked={remember}
          onChange={(event) => {
            const checked = event.target.checked;
            setRemember(checked);
            if (!checked) {
              localStorage.removeItem(storageKey(portal));
            }
          }}
        />
        ID/비밀번호 기억하기
      </label>
    </div>
  );
}
