"use client";

import { useEffect, useState } from "react";
import { clearAdminFlash } from "@/actions/admin-feedback";

type Toast = { id: string; message: string } | null;

export function AdminToast({ initialToast }: { initialToast: Toast }) {
  const [toast, setToast] = useState(initialToast);

  useEffect(() => {
    setToast(initialToast);
    if (!initialToast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      void clearAdminFlash();
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [initialToast]);

  if (!toast) return null;

  return (
    <div className="fixed right-6 top-6 z-[200] flex min-w-72 items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl" role="status" aria-live="polite">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-800 text-xs text-white">✓</span>
      <p className="pt-0.5">{toast.message}</p>
      <button type="button" className="ml-auto text-slate-400" aria-label="알림 닫기" onClick={() => { setToast(null); void clearAdminFlash(); }}>×</button>
    </div>
  );
}
