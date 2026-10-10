"use client";

import { useEffect, useTransition, useState } from "react";
import { updateCartLine } from "@/actions/commerce";

export function CartControls({
  productId,
  quantity,
  onePlusOne = false,
  onQuantityChange,
}: {
  productId: string;
  quantity: number;
  onePlusOne?: boolean;
  onQuantityChange?: (quantity: number) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [displayQuantity, setDisplayQuantity] = useState(quantity);

  useEffect(() => {
    setDisplayQuantity(quantity);
  }, [quantity]);

  function setQty(next: number) {
    if (!Number.isSafeInteger(next) || next < 0 || next === displayQuantity) return;
    const previous = displayQuantity;
    setDisplayQuantity(next);
    onQuantityChange?.(next);
    setError("");
    start(async () => {
      const result = await updateCartLine(productId, next, onePlusOne);
      if (result.error) {
        setDisplayQuantity(previous);
        onQuantityChange?.(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <button type="button" data-testid="장바구니수량감소" className="grid h-7 w-7 place-items-center border border-line disabled:opacity-40" disabled={pending} onClick={() => setQty(displayQuantity - 1)}>
        -
      </button>
      <span data-testid="장바구니수량" data-quantity={displayQuantity}>{displayQuantity}{onePlusOne ? "세트" : ""}</span>
      <button type="button" data-testid="장바구니수량증가" className="grid h-7 w-7 place-items-center border border-line disabled:opacity-40" disabled={pending} onClick={() => setQty(displayQuantity + 1)}>
        +
      </button>
      {pending ? <span className="text-xs text-muted" role="status">변경 중…</span> : null}
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
