"use client";

import { useEffect, useState } from "react";

export function CouponDownloadDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-[#cfcfcf] px-4 py-2 text-sm">
        다운 받을 수 있는 쿠폰 보기
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-download-title"
            className="w-full max-w-5xl bg-white p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="coupon-download-title" className="text-2xl font-bold">쿠폰 다운로드 받기</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted" aria-label="닫기">
                닫기
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
