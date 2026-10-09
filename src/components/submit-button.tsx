"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

export function SubmitButton({ children, disabled, pendingLabel = "처리 중…", ...props }: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type={props.type ?? "submit"} disabled={disabled || pending} aria-busy={pending}>
      {pending ? <span className="inline-flex items-center justify-center gap-2" role="status"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />{pendingLabel}</span> : children}
    </button>
  );
}
