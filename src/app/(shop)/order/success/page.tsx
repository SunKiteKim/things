"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = Number(params.get("amount") ?? 0);
    const internalId = params.get("internalId");

    async function confirm() {
      const response = await fetch("/api/payments/toss/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });
      const data = await response.json();
      router.replace(`/order/complete?orderId=${data.orderId ?? internalId ?? ""}`);
    }

    confirm();
  }, [params, router]);

  return <p className="py-20 text-center text-muted">결제를 확인하고 있습니다…</p>;
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
