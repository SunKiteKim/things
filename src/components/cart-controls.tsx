"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [displayQuantity, setDisplayQuantity] = useState(quantity);

  useEffect(() => {
    setDisplayQuantity(quantity);
  }, [quantity]);

  function setQty(next: number) {
    start(async () => {
      const result = await updateCartLine(productId, next, onePlusOne);
      setError(result.error ?? "");
      if (!result.error) {
        setDisplayQuantity(next);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <button type="button" data-testid="장바구니수량감소" className="grid h-7 w-7 place-items-center border border-line disabled:opacity-40" disabled={pending} onClick={() => setQty(displayQuantity - 1)}>
        -
      </button>
      <span data-testid="장바구니수량" data-quantity={displayQuantity}>{displayQuantity}{onePlusOne ? "세트" : ""}</span>
      {error && <span role="alert">{error}</span>}
      <button type="button" data-testid="장바구니수량증가" className="grid h-7 w-7 place-items-center border border-line disabled:opacity-40" disabled={pending} onClick={() => setQty(displayQuantity + 1)}>
        +
      </button>
    </div>
  );
}
