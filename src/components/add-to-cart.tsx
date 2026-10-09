"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart, buyNow } from "@/actions/commerce";

export function AddToCart({ productId, stock, onePlusOne = false }: { productId: string; stock: number; onePlusOne?: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const max = Math.max(Math.floor(stock / (onePlusOne ? 2 : 1)), 0);
  const soldOut = max <= 0;

  function changeQty(next: number) {
    if (soldOut) return;
    setQuantity(Math.min(max, Math.max(1, Math.floor(next))));
  }

  return (
    <div className="mt-10" data-testid="구매영역" data-purchasable={soldOut ? "false" : "true"}>
      <div className="flex items-center justify-between gap-16">
        <span className="text-sm">수량</span>
        <div className="qty-box">
          <button type="button" data-testid="수량감소" disabled={soldOut || pending} onClick={() => changeQty(quantity - 1)}>
            −
          </button>
          <input
            data-testid="수량"
            data-quantity={quantity}
            type="number"
            min={1}
            max={max || 1}
            value={quantity}
            disabled={soldOut}
            onChange={(event) => changeQty(Number(event.target.value) || 1)}
          />
          <button type="button" data-testid="수량증가" disabled={soldOut || pending} onClick={() => changeQty(quantity + 1)}>
            +
          </button>
        </div>
      </div>
      <p className={`mt-3 text-sm font-medium ${onePlusOne ? "text-accent" : "text-muted"}`}>
        {onePlusOne
          ? `1+1 혜택 적용 · 구매 ${quantity}개 + 증정 ${quantity}개 (총 ${quantity * 2}개)`
          : "현재 적용된 추가 혜택이 없습니다."}
      </p>
      {error ? <p className="mt-4 text-sm text-accent" role="alert">{error}</p> : null}
      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          data-testid="장바구니담기"
          className="btn btn-ghost w-44"
          disabled={soldOut || pending}
          onClick={() =>
            start(async () => {
              const result = await addToCart(productId, quantity, onePlusOne);
              if (result.error) {
                setError(result.error);
                return;
              }
              setError("");
              setAdded(true);
            })
          }
        >
          {pending ? "처리 중" : "장바구니 담기"}
        </button>
        <button
          type="button"
          data-testid="바로구매"
          className="btn w-44"
          disabled={soldOut || pending}
          onClick={() =>
            start(async () => {
              const result = await buyNow(productId, quantity, onePlusOne);
              if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "처리 중…" : "바로구매"}
        </button>
      </div>
      {soldOut ? <p className="mt-4 text-sm text-accent">일시품절입니다.</p> : null}

      {added ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 px-5" role="presentation">
          <div
            className="w-full max-w-sm bg-white p-7 shadow-2xl"
            role="dialog"
            data-testid="장바구니담기완료"
            aria-modal="true"
            aria-labelledby="cart-added-title"
          >
            <p id="cart-added-title" className="text-lg font-bold">장바구니 담기에 성공했습니다.</p>
            <p className="mt-2 text-sm leading-6 text-muted">장바구니에서 상품과 적용된 혜택을 확인할 수 있습니다.</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-ghost" data-testid="계속쇼핑" onClick={() => setAdded(false)}>
                계속 쇼핑
              </button>
              <Link href="/cart" className="btn" data-testid="장바구니이동">
                장바구니로 이동
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
