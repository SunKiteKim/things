"use client";
import { useState, useTransition } from "react";
import { selectCartCoupon } from "@/actions/commerce";
export function CartCoupon({ options, selected }: { options: { code: string; label: string; eligible: boolean }[]; selected: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return <div className="mt-5"><label htmlFor="cart-coupon">장바구니 쿠폰 선택</label><select id="cart-coupon" className="field mt-2" value={selected} disabled={pending} onChange={event => { const code = event.target.value; start(async () => { const result = await selectCartCoupon(code); setError("error" in result ? result.error ?? "" : ""); }); }}><option value="">선택 안 함</option>{options.map(option => <option key={option.code} value={option.code} disabled={!option.eligible}>{option.label}{!option.eligible ? " · 조건 미충족" : ""}</option>)}</select><p className="mt-2 text-xs text-muted">증정품을 제외한 구매 수량 기준 · 쿠폰 1개 적용</p>{error && <p role="alert">{error}</p>}</div>;
}
