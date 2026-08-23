"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart, buyNow } from "@/actions/commerce";

export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, start] = useTransition();
  const max = Math.max(stock, 0);
  const soldOut = max <= 0;

  function changeQty(next: number) {
    if (soldOut) return;
    setQuantity(Math.min(max, Math.max(1, next)));
  }

  return (
    <div className="mt-8 max-w-sm space-y-5">
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
              await addToCart(productId, quantity);
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
              const result = await buyNow(productId, quantity);
              if (result && "error" in result && result.error) return;
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
