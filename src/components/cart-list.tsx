"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCartLines, selectCartCoupon } from "@/actions/commerce";
import { CartControls } from "@/components/cart-controls";
import { CouponPicker, type CouponNotice, type CouponOption, type DownloadableCoupon } from "@/components/cart-coupon";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/utils";

type AppliedCoupon = { code: string; label: string; amount: number; scope?: string };

const PRODUCT_SCOPES = new Set(["PRODUCT", "ONE_PLUS_ONE"]);

function isProductCoupon(scope?: string) {
  return !!scope && PRODUCT_SCOPES.has(scope);
}

export type CartRow = {
  productId: string;
  quantity: number;
  onePlusOne?: boolean;
  product: { id: string; name: string; price: number; imageUrl: string; categoryId: string };
};

export function cartRowKey(row: Pick<CartRow, "productId" | "onePlusOne">) {
  return `${row.productId}:${row.onePlusOne ? "1" : "0"}`;
}

export function CartList({ rows, couponOptions, couponNotices = [], downloads = [], signedIn = false, selectedCoupon, subtotal, selected, onSelectedChange, appliedCoupons }: { rows: CartRow[]; couponOptions: CouponOption[]; couponNotices?: CouponNotice[]; downloads?: DownloadableCoupon[]; signedIn?: boolean; selectedCoupon: string; subtotal: number; selected: string[]; onSelectedChange: (next: string[]) => void; appliedCoupons: Record<string, AppliedCoupon[]> }) {
  const router = useRouter();
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponTab, setCouponTab] = useState("product");
  const productOptions = couponOptions.filter((option) => isProductCoupon(option.scope));
  const cartOptions = couponOptions.filter((option) => option.scope === "CART" || option.scope === "MULTI_CART");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const keys = useMemo(() => rows.map(cartRowKey), [rows]);
  const allSelected = keys.length > 0 && keys.every((key) => selected.includes(key));

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  function remove(keysToRemove: string[]) {
    const lines = rows.filter((row) => keysToRemove.includes(cartRowKey(row))).map((row) => ({ productId: row.productId, onePlusOne: row.onePlusOne }));
    startTransition(async () => {
      const result = await removeCartLines(lines);
      setMessage(result.error ?? result.message ?? "처리되었습니다.");
      if (!result.error) {
        onSelectedChange(selected.filter((key) => !keysToRemove.includes(key)));
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-ink pb-3">
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allSelected} onChange={() => onSelectedChange(allSelected ? [] : keys)} /> 전체 선택</label><span className="text-sm text-muted">총 {rows.length}개</span></div>
        <div className="flex items-center gap-3">
          <button type="button" className="text-sm underline underline-offset-4" onClick={() => { setCouponTab("cart"); setCouponOpen(true); }}>쿠폰 변경하기</button>
          <button type="button" className="text-sm underline underline-offset-4 disabled:text-muted" disabled={pending || selected.length === 0} onClick={() => remove(selected)}>선택삭제</button>
        </div>
      </div>
      <div className="space-y-0">
        {rows.map((row) => {
          const key = cartRowKey(row);
          const coupons = (appliedCoupons[key] ?? []).filter((coupon) => isProductCoupon(coupon.scope));
          return (
            <div key={key} className="relative grid grid-cols-[24px_96px_1fr] gap-4 border-b border-line py-6" data-testid="장바구니상품" data-product-id={row.product.id} data-quantity={row.quantity} data-unit-price={row.product.price} data-line-amount={row.product.price * row.quantity}>
              <input className="mt-1" type="checkbox" aria-label={`${row.product.name} 선택`} checked={selected.includes(key)} onChange={() => onSelectedChange(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key])} />
              <div className="relative aspect-square overflow-hidden bg-surface"><ProductImage src={row.product.imageUrl} alt={row.product.name} fill /></div>
              <div className="pr-14">
                <button type="button" data-testid="상품삭제" className="absolute right-0 top-5 text-xs text-muted underline underline-offset-4 hover:text-ink" disabled={pending} onClick={() => remove([key])}>삭제</button>
                <Link href={`/product/${row.product.id}`} className="product-name" data-testid="장바구니상품명">{row.product.name}</Link>
                <p className="mt-1 text-xs text-muted" data-testid="장바구니상품번호">{row.product.id}</p>
                <p className="mt-1 text-base font-bold" style={{ color: "#3f3b37" }} data-testid="장바구니단가" data-price={row.product.price}>{formatPrice(row.product.price)}</p>
                {coupons.length === 0 ? <p className="mt-1 text-xs text-muted"><button type="button" className="underline underline-offset-2" onClick={() => { setCouponTab("product"); setCouponOpen(true); }}>상품쿠폰 적용하기&gt;</button></p> : null}
                {coupons.length > 0 ? (
                  <div className="mt-2 text-sm text-muted">
                    <p>적용된 쿠폰</p>
                    {coupons.map((coupon) => (
                      <p key={coupon.code} className="mt-1">&gt; {coupon.label} {formatPrice(coupon.amount)}</p>
                    ))}
                    <p className="mt-1 text-xs text-muted"><button type="button" className="underline underline-offset-2" onClick={() => { setCouponTab("product"); setCouponOpen(true); }}>상품쿠폰 변경하기</button></p>
                  </div>
                ) : null}
                {row.onePlusOne ? <p className="mt-1 text-sm">1+1 · 구매 {row.quantity}개 + 증정 {row.quantity}개</p> : null}
                <CartControls productId={row.productId} quantity={row.quantity} onePlusOne={row.onePlusOne} />
              </div>
            </div>
          );
        })}
      </div>
      {message ? <div className="fixed bottom-6 right-6 z-[150] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl" role="status">{message}</div> : null}
      <CouponPicker
        title="쿠폰 변경"
        options={couponOptions}
        groups={[{ id: "product", label: "상품쿠폰", options: productOptions }, { id: "cart", label: "장바구니 쿠폰", options: cartOptions }]}
        initialGroup={couponTab}
        products={rows.map((row) => ({ key: cartRowKey(row), productId: row.productId, onePlusOne: row.onePlusOne, name: row.product.name, price: row.product.price, quantity: row.quantity, imageUrl: row.product.imageUrl }))}
        notices={couponNotices}
        downloads={downloads}
        signedIn={signedIn}
        selected={selectedCoupon}
        subtotal={subtotal}
        showApplied={false}
        opened={couponOpen}
        onOpenedChange={setCouponOpen}
        onApply={async (option) => {
          const result = await selectCartCoupon(option.code || "-");
          if ("error" in result && result.error) throw new Error(result.error);
          router.refresh();
        }}
      />
    </div>
  );
}
