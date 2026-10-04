"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

type ServerAction = (formData: FormData) => Promise<void>;

export function AdminCreateModal({
  title,
  triggerLabel,
  action,
  children,
  wide = false,
}: {
  title: string;
  triggerLabel: string;
  action?: ServerAction;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (!action) return;
    startTransition(async () => {
      await action(formData);
      setOpen(false);
    });
  }

  const dialog = open ? (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/45 px-5 py-10" role="presentation">
      <div className={`flex max-h-[88vh] w-full flex-col rounded-lg bg-white shadow-2xl ${wide ? "max-w-5xl" : "max-w-2xl"}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-2xl leading-none text-muted" aria-label={`${title} 닫기`} onClick={() => setOpen(false)}>×</button>
        </div>
        {action ? (
          <form action={submit} className="min-h-0 overflow-y-auto p-6">
            <div className="grid gap-4">{children}</div>
            <div className="mt-7 flex justify-end gap-2 border-t border-line pt-5">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button>
              <button className="btn" type="submit" disabled={pending}>{pending ? "처리 중…" : triggerLabel}</button>
            </div>
          </form>
        ) : (
          <div className="min-h-0 overflow-y-auto p-6">{children}</div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>{triggerLabel}</button>
      {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
