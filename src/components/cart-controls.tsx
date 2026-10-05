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
    <div className="mt-3 flex items-center gap-3 text-sm">
      <button type="button" className="btn btn-ghost min-h-8 px-3" disabled={pending} onClick={() => setQty(displayQuantity - 1)}>
        -
      </button>
      <span>{displayQuantity}{onePlusOne ? "세트" : "개"}</span>
      {error && <span role="alert">{error}</span>}
      <button type="button" className="btn btn-ghost min-h-8 px-3" disabled={pending} onClick={() => setQty(displayQuantity + 1)}>
        +
      </button>
    </div>
  );
}
