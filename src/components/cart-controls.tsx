"use client";

import { useTransition, useState } from "react";
import { updateCartLine } from "@/actions/commerce";

export function CartControls({
  productId,
  quantity,
  onePlusOne = false,
}: {
  productId: string;
  quantity: number;
  onePlusOne?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function setQty(next: number) {
    start(async () => {
      const result = await updateCartLine(productId, next, onePlusOne);
      setError(result.error ?? "");
    });
  }

  return (
    <div className="mt-3 flex items-center gap-3 text-sm">
      <button type="button" className="btn btn-ghost min-h-8 px-3" disabled={pending} onClick={() => setQty(quantity - 1)}>
        -
      </button>
      <span>{quantity}{onePlusOne ? "세트" : "개"}</span>
      {error && <span role="alert">{error}</span>}
      <button type="button" className="btn btn-ghost min-h-8 px-3" disabled={pending} onClick={() => setQty(quantity + 1)}>
        +
      </button>
    </div>
  );
}
