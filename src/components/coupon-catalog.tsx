"use client";

import { useState } from "react";
import { claimCoupon } from "@/actions/commerce";
import { couponToneColor } from "@/components/coupon-ticket";
import { couponToneLabel, type MemberCouponView } from "@/lib/member-coupons";

function DownloadMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function CouponCard({ coupon }: { coupon: MemberCouponView }) {
  const [open, setOpen] = useState(false);
  const color = couponToneColor(coupon.tone);
  return (
    <article className="relative flex min-h-[176px] bg-white" style={{ boxShadow: `inset 0 0 0 1px ${color}` }}>
      <div className="min-w-0 flex-1 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className={`font-semibold leading-none text-[#e23b3b] ${coupon.discount.length > 5 ? "text-2xl" : "text-4xl"}`}>{coupon.discount}</p>
          <span className="shrink-0 rounded-full px-2 py-1 text-[11px]" style={{ color, backgroundColor: coupon.tone === "product" ? "#eef3ff" : "#fff4ea" }}>
            {couponToneLabel(coupon.tone)}
          </span>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-5">{coupon.name}</p>
        <p className="mt-2 text-xs text-muted">{coupon.endsLabel}</p>
        <button type="button" className="mt-3 text-xs text-muted" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          상세정보 ›
        </button>
        {open ? <p className="mt-2 text-xs leading-5 text-muted">{coupon.basis} · {coupon.limit}</p> : null}
      </div>
      <div className="relative flex w-[76px] shrink-0 items-center justify-center">
        <span className="absolute inset-y-4 left-0 border-l border-dashed" style={{ borderColor: color }} />
        {coupon.owned ? (
          <span className="text-xs" style={{ color }}>받음</span>
        ) : (
          <form action={claimCoupon}>
            <input type="hidden" name="couponId" value={coupon.id} />
            <input type="hidden" name="returnTo" value="/coupons" />
            <button type="submit" aria-label={`${coupon.name} 다운`} className="flex h-10 w-10 items-center justify-center" style={{ color }}>
              <DownloadMark />
            </button>
          </form>
        )}
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          className="pointer-events-none absolute -right-[7px] h-3.5 w-3.5 rounded-full bg-paper"
          style={{ top: `${10 + index * 15}%`, boxShadow: `inset 0 0 0 1px ${color}` }}
        />
      ))}
    </article>
  );
}

export function CouponCatalog({ coupons }: { coupons: MemberCouponView[] }) {
  const [tab, setTab] = useState<"download" | "usable">("download");
  const usable = coupons.filter((coupon) => coupon.owned);
  const rows = tab === "usable" ? usable : coupons;

  return (
    <div>
      <div className="flex gap-8 border-b border-line text-sm">
        <button type="button" onClick={() => setTab("download")} className={`pb-3 ${tab === "download" ? "border-b-2 border-ink font-bold" : "text-muted"}`}>
          다운로드 {coupons.length}
        </button>
        <button type="button" onClick={() => setTab("usable")} className={`pb-3 ${tab === "usable" ? "border-b-2 border-ink font-bold" : "text-muted"}`}>
          사용가능 {usable.length}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">{tab === "usable" ? "사용할 수 있는 쿠폰이 없습니다." : "진행 중인 쿠폰이 없습니다."}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} />)}
        </div>
      )}
    </div>
  );
}
