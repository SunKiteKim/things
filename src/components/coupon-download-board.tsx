"use client";

import { useState } from "react";
import { claimCoupon } from "@/actions/commerce";
import { CouponTicket } from "@/components/coupon-ticket";
import type { CouponTone, MemberCouponView } from "@/lib/member-coupons";

const TABS: { tone: CouponTone; label: string }[] = [
  { tone: "product", label: "상품쿠폰" },
  { tone: "cart", label: "장바구니 쿠폰" },
];

export function CouponDownloadBoard({ coupons, returnTo }: { coupons: MemberCouponView[]; returnTo: string }) {
  const [tone, setTone] = useState<CouponTone>("product");
  const rows = coupons.filter((coupon) => coupon.tone === tone);

  return (
    <div>
      <div className="grid grid-cols-2 border border-line">
        {TABS.map((tab) => (
          <button
            key={tab.tone}
            type="button"
            onClick={() => setTone(tab.tone)}
            className={`py-3 text-sm ${tone === tab.tone ? "border-b-2 border-[#1f8a4c] font-bold" : "bg-[#f7f7f7] text-muted"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">받을 수 있는 쿠폰이 없습니다.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-line text-center text-muted">
                <th className="px-3 py-3 text-left font-normal">쿠폰</th>
                <th className="px-3 py-3 text-left font-normal">쿠폰명</th>
                <th className="px-3 py-3 font-normal">할인금액</th>
                <th className="px-3 py-3 font-normal">적용기준</th>
                <th className="px-3 py-3 font-normal">제한조건</th>
                <th className="px-3 py-3 font-normal">유효기간</th>
                <th className="px-3 py-3 font-normal">받기</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((coupon) => (
                <tr key={coupon.id} className="border-b border-line text-center">
                  <td className="px-3 py-4 text-left"><CouponTicket tone={coupon.tone} /></td>
                  <td className="px-3 py-4 text-left">{coupon.name}</td>
                  <td className="px-3 py-4">{coupon.discount}</td>
                  <td className="px-3 py-4">{coupon.basis}</td>
                  <td className="px-3 py-4">{coupon.limit}</td>
                  <td className="px-3 py-4">{coupon.period}</td>
                  <td className="px-3 py-4">
                    {coupon.owned ? (
                      <span className="text-muted">받은 쿠폰</span>
                    ) : (
                      <form action={claimCoupon}>
                        <input type="hidden" name="couponId" value={coupon.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <button className="rounded-full border border-line px-3 py-1.5 text-xs">다운</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
