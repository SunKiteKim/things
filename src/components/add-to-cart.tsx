"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart, buyNow } from "@/actions/commerce";

export function AddToCart({ productId, stock, onePlusOne = false }: { productId: string; stock: number; onePlusOne?: boolean }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, start] = useTransition();
  const [bundle, setBundle] = useState(false);
  const [error, setError] = useState("");
  const max = Math.max(Math.floor(stock / (bundle ? 2 : 1)), 0);
  const soldOut = max <= 0;

  function changeQty(next: number) {
    if (soldOut) return;
    setQuantity(Math.min(max, Math.max(1, Math.floor(next))));
  }

  return (
    <div className="mt-8 max-w-sm space-y-5">
      {onePlusOne && <label>구매 옵션<select className="field" value={bundle ? "bundle" : "single"} disabled={pending} onChange={event => { setBundle(event.target.value === "bundle"); setQuantity(1); }}><option value="single">일반 구매</option><option value="bundle" disabled={stock < 2}>1+1 할인 · 같은 상품 1개 증정</option></select></label>}
      {bundle && <p>{quantity}세트 · 총 {quantity * 2}개 수령</p>}
      {error && <p role="alert">{error}</p>}
      <div className="form-row">
        <span>수량</span>
        <div className="qty-box">
          <button type="button" disabled={soldOut || pending} onClick={() => changeQty(quantity - 1)}>
            −
          </button>
          <input
            type="number"
            min={1}
            max={max || 1}
            value={quantity}
            disabled={soldOut}
            onChange={(event) => changeQty(Number(event.target.value) || 1)}
          />
          <button type="button" disabled={soldOut || pending} onClick={() => changeQty(quantity + 1)}>
            +
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={soldOut || pending}
          onClick={() =>
            start(async () => {
              const result = await addToCart(productId, quantity, bundle);
              setError(result.error ?? "");
              router.refresh();
            })
          }
        >
          {pending ? "처리 중" : "장바구니 담기"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={soldOut || pending}
          onClick={() =>
            start(async () => {
              const result = await buyNow(productId, quantity, bundle);
              if (result?.error) setError(result.error);
            })
          }
        >
          바로구매
        </button>
      </div>
      {soldOut ? <p className="text-sm text-accent">일시품절입니다.</p> : null}
    </div>
  );
}
