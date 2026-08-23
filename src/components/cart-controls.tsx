"use client";

import { useTransition } from "react";
import { updateCartLine } from "@/actions/commerce";

export function CartControls({
  productId,
  quantity,
}: {
  productId: string;
  quantity: number;
}) {
  const [pending, start] = useTransition();

  function setQty(next: number) {
    start(async () => {
      await updateCartLine(productId, next);
    });
  }

  return (
    <div className="mt-3 flex items-center gap-3 text-sm">
      <button type="button" className="btn btn-ghost min-h-8 px-3" disabled={pending} onClick={() => setQty(quantity - 1)}>
        -
      </button>
      <span>{quantity}</span>
      <button type="button" className="btn btn-ghost min-h-8 px-3" disabled={pending} onClick={() => setQty(quantity + 1)}>
        +
      </button>
    </div>
  );
}
