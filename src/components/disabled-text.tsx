import type { ReactNode } from "react";

export function DisabledText({ children }: { children: ReactNode }) {
  return (
    <div
      aria-disabled="true"
      className="min-h-[3.2rem] w-full bg-[#f3f4f6] px-4 py-[0.85rem] text-muted"
    >
      {children || "-"}
    </div>
  );
}
