"use client";

import { useEffect, useMemo, useState } from "react";
import { checkoutFromCart } from "@/actions/commerce";
import { CartList, cartRowKey, type CartRow } from "@/components/cart-list";
import type { CouponNotice, CouponOption, DownloadableCoupon } from "@/components/cart-coupon";
import { couponCodes, couponTargets, combinedDiscount, shippingFee, SHIPPING_NOTICE } from "@/lib/checkout-pricing";
import { couponDiscountForLines, couponEligibleProductIds } from "@/lib/discounts";
import { formatPrice } from "@/lib/utils";

export type CartCouponRule = {
  code: string;
  summary: string;
  isStackable: boolean;
  scope: string;
  isActive: boolean;
  isPaused: boolean;
  startAt: string;
  endAt: string;
  maxUses: number | null;
  usedCount: number;
  minOrderAmount: number;
  minQuantity: number;
  discountType: string;
  discountValue: number;
  maxDiscountAmount: number;
  includedProductIds: string;
  excludedProductIds: string;
  issues: { targetType: string; userId: string | null; categoryId: string | null }[];
};

const PRODUCT_SCOPES = new Set(["PRODUCT", "ONE_PLUS_ONE"]);

function couponLines(rows: CartRow[]) {
  return rows.map((row) => ({
    productId: row.product.id,
    categoryId: row.product.categoryId,
    amount: row.product.price * row.quantity,
    quantity: row.quantity,
    onePlusOne: row.onePlusOne === true,
  }));
}

function offerFor(coupon: CartCouponRule, lines: ReturnType<typeof couponLines>, userId?: string, target?: string) {
  if (lines.reduce((sum, line) => sum + line.amount, 0) <= 0) return null;
  const discount = couponDiscountForLines({ ...coupon, startAt: new Date(coupon.startAt), endAt: new Date(coupon.endAt) }, lines, new Date(), userId, target);
  return discount != null && discount > 0 ? { code: coupon.code, label: coupon.summary, discount, isStackable: coupon.isStackable, scope: coupon.scope } : null;
}

function summarize(rows: CartRow[], selected: string[], coupons: CartCouponRule[], userId: string | undefined, selectedCoupon: string) {
  const targets = couponTargets(selectedCoupon);
  const chosen = rows.filter((row) => selected.includes(cartRowKey(row)));
  const subtotal = chosen.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const chosenLines = couponLines(chosen);
  const productCoupons = coupons.filter((coupon) => PRODUCT_SCOPES.has(coupon.scope));
  const cartCoupons = coupons.filter((coupon) => coupon.scope === "CART" || coupon.scope === "MULTI_CART");
  const productOffers = productCoupons.flatMap((coupon) => {
    const offer = offerFor(coupon, chosenLines, userId, targets[coupon.code.toUpperCase()]);
    return offer ? [offer] : [];
  });
  const cartOffers = cartCoupons.flatMap((coupon) => {
    const offer = offerFor(coupon, chosenLines, userId, targets[coupon.code.toUpperCase()]);
    return offer ? [offer] : [];
  });
  const offers = [...productOffers, ...cartOffers];
  let discount = 0;
  try {
    discount = combinedDiscount(offers, subtotal);
  } catch {
    discount = offers.reduce((sum, offer) => sum + offer.discount, 0);
  }
  let remaining = discount;
  const discountLines = offers.flatMap((offer) => {
    const amount = Math.min(Math.max(offer.discount, 0), remaining);
    remaining -= amount;
    return amount > 0 ? [{ code: offer.code, label: offer.label, amount, scope: offer.scope }] : [];
  });
  const shipping = shippingFee(Math.max(subtotal - discount, 0));
  const items = chosen.map((row) => ({
    key: cartRowKey(row),
    name: row.product.name,
    quantity: row.quantity,
    onePlusOne: row.onePlusOne === true,
    amount: row.product.price * row.quantity,
  }));
  const appliedCoupons: Record<string, { code: string; label: string; amount: number; scope: string }[]> = {};
  const everyLine = couponLines(rows);
  for (const coupon of productCoupons) {
    const offer = offerFor(coupon, everyLine, userId, targets[coupon.code.toUpperCase()]);
    if (!offer) continue;
    const rule = { ...coupon, startAt: new Date(coupon.startAt), endAt: new Date(coupon.endAt) };
    const target = targets[coupon.code.toUpperCase()];
    const productIds = couponEligibleProductIds(rule, everyLine, new Date(), userId, target);
    const flag = target?.split(":")[1];
    const matched = rows.filter((row) => productIds.includes(row.product.id) && (flag === "0" || flag === "1" ? !!row.onePlusOne === (flag === "1") : true));
    const base = matched.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
    let allocated = 0;
    matched.forEach((row, index) => {
      const share = index === matched.length - 1 ? offer.discount - allocated : base > 0 ? Math.round((offer.discount * row.product.price * row.quantity) / base) : 0;
      allocated += share;
      const key = cartRowKey(row);
      appliedCoupons[key] = [...(appliedCoupons[key] ?? []), { code: offer.code, label: offer.label, amount: share, scope: coupon.scope }];
    });
  }
  const orderQuantity = chosen.reduce((sum, row) => sum + row.quantity, 0);
  return { subtotal, discount, shipping, payable: Math.max(subtotal - discount, 0) + shipping, discountLines, items, appliedCoupons, orderQuantity };
}

export function CartBoard({
  rows,
  couponOptions,
  couponNotices = [],
  downloads = [],
  signedIn = false,
  selectedCoupon,
  subtotal,
  coupons,
  userId,
}: {
  rows: CartRow[];
  couponOptions: CouponOption[];
  couponNotices?: CouponNotice[];
  downloads?: DownloadableCoupon[];
  signedIn?: boolean;
  selectedCoupon: string;
  subtotal: number;
  coupons: CartCouponRule[];
  userId?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const applied = useMemo(() => coupons.filter((coupon) => couponCodes(selectedCoupon).includes(coupon.code.toUpperCase())), [coupons, selectedCoupon]);
  const summary = useMemo(() => summarize(rows, selected, applied, userId, selectedCoupon), [rows, selected, applied, userId, selectedCoupon]);

  useEffect(() => {
    const keys = new Set(rows.map(cartRowKey));
    setSelected((current) => current.filter((key) => keys.has(key)));
  }, [rows]);

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_0.6fr]">
      <CartList rows={rows} couponOptions={couponOptions} couponNotices={couponNotices} downloads={downloads} signedIn={signedIn} selectedCoupon={selectedCoupon} subtotal={subtotal} selected={selected} onSelectedChange={setSelected} appliedCoupons={summary.appliedCoupons} />
      <aside className="h-fit border border-line bg-surface p-6">
        <p className="text-sm text-muted">주문 상품</p>
        {summary.items.length > 0 ? (
          <ul className="mt-4 space-y-3 text-sm">
            {summary.items.map((item) => (
              <li key={item.key} className="flex justify-between gap-4">
                <span>
                  <span className="product-name">{item.name}</span> × {item.quantity}{item.onePlusOne ? ` (1+1 증정 ${item.quantity}개)` : ""}
                </span>
                <span className="shrink-0">{formatPrice(item.amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-6 flex justify-between text-base">
          <span>상품 금액 합계</span>
          <span className="font-bold">{formatPrice(summary.subtotal)}</span>
        </p>
        <p className="mt-3 flex items-center justify-between text-base">
          <span>할인금액 합계</span>
          <span className="flex items-center">
            {summary.discountLines.length > 0 ? (
              <button type="button" className="mr-2 inline-flex items-center gap-1 leading-none text-muted" style={{ fontSize: "10px" }} aria-expanded={detailsOpen} aria-label="쿠폰 적용 상세" onClick={() => setDetailsOpen((open) => !open)}>
                <span>{detailsOpen ? "▴" : "▽"}</span>
                <span>더보기</span>
              </button>
            ) : null}
            <span className="text-[#e10600]">{summary.discount > 0 ? `-${formatPrice(summary.discount)}` : formatPrice(summary.discount)}</span>
          </span>
        </p>
        {detailsOpen && summary.discountLines.length > 0 ? (
          <ul className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-muted">
            {summary.discountLines.map((line) => (
              <li key={line.code} className="flex justify-between gap-4">
                <span>&gt; {line.label}</span>
                <span className="shrink-0">{formatPrice(line.amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 flex justify-between text-base">
          <span>배송비</span>
          <span>{formatPrice(summary.shipping)}</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{SHIPPING_NOTICE}</p>
        <p className="mt-5 flex justify-between text-2xl font-bold">
          <span>예상 결제금액</span>
          <span>{formatPrice(summary.payable)}</span>
        </p>
        <form action={checkoutFromCart}>
          {selected.map((key) => <input key={key} type="hidden" name="line" value={key} />)}
          <button className="btn mt-6 w-full" type="submit" disabled={selected.length === 0}>총 {summary.orderQuantity}개 주문하기</button>
        </form>
      </aside>
    </div>
  );
}
