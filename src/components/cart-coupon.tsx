"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectCartCoupon } from "@/actions/commerce";
import { formatPrice } from "@/lib/utils";

export type CouponOption = { code: string; label: string; eligible: boolean; discount: number; isStackable: boolean };

export function CouponPicker({ options, selected, subtotal, onApply }: { options: CouponOption[]; selected: string; subtotal: number; onApply: (option: CouponOption) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(selected);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const preview = options.find((option) => option.code === code);
  const applied = options.find((option) => option.code === selected);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-medium">적용 쿠폰</p><p className="mt-1 text-xs text-muted">{applied?.label ?? "적용 가능한 쿠폰 없음"}</p></div>
        <button type="button" className="btn btn-ghost shrink-0" onClick={() => { setCode(selected); setError(""); setOpen(true); }} disabled={!options.length}>쿠폰변경</button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/45 px-5 py-10" role="presentation">
          <div className="flex max-h-[82vh] w-full max-w-xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="coupon-picker-title">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div><h2 id="coupon-picker-title" className="text-lg font-semibold">쿠폰 변경</h2><p className="mt-1 text-xs text-muted">적용할 쿠폰과 예상 결제금액을 확인해 주세요.</p></div>
              <button type="button" className="text-2xl leading-none" aria-label="쿠폰 변경 닫기" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="divide-y divide-line border border-line">
                {options.map((option) => (
                  <label key={option.code} className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-4 ${option.eligible ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed opacity-45"}`}>
                    <input type="radio" name="coupon-option" checked={code === option.code} disabled={!option.eligible} onChange={() => setCode(option.code)} />
                    <span className="text-sm"><strong>{option.label}</strong><span className="mt-1 block text-xs text-muted">{option.code} · 중복 적용 {option.isStackable ? "가능" : "불가"}</span></span>
                    <span className="text-sm font-semibold text-accent">-{formatPrice(option.discount)}</span>
                  </label>
                ))}
              </div>
              {preview ? <div className="mt-5 bg-slate-50 px-4 py-4 text-sm"><p className="flex justify-between"><span>예상 할인</span><strong>-{formatPrice(preview.discount)}</strong></p><p className="mt-2 flex justify-between text-base"><span>예상 결제금액</span><strong>{formatPrice(Math.max(subtotal - preview.discount, 0))}</strong></p></div> : null}
              {error ? <p className="mt-3 text-sm text-accent" role="alert">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button>
              <button type="button" className="btn" disabled={pending || !preview} onClick={() => startTransition(async () => { if (!preview) return; setError(""); try { await onApply(preview); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "쿠폰을 변경하지 못했습니다."); } })}>{pending ? "적용 중…" : "적용하기"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CartCoupon({ options, selected, subtotal }: { options: CouponOption[]; selected: string; subtotal: number }) {
  const router = useRouter();
  return <CouponPicker options={options} selected={selected} subtotal={subtotal} onApply={async (option) => { const result = await selectCartCoupon(option.code); if ("error" in result && result.error) throw new Error(result.error); router.refresh(); }} />;
}
