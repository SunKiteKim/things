"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { applyCoupon, completeDemoPayment, createPendingOrder } from "@/actions/commerce";
import { formatPrice } from "@/lib/utils";
import { FormField } from "@/components/form-field";
import { PostcodeAddress } from "@/components/postcode-address";

type TossWidgets = ReturnType<Awaited<ReturnType<typeof loadTossPayments>>["widgets"]>;

type Props = {
  user: {
    id: string;
    name: string;
    phone: string;
    zipCode: string;
    address: string;
    addressDetail: string;
    email: string;
  };
  subtotal: number;
  orderName: string;
  tossClientKey: string;
};

export function CheckoutClient({ user, subtotal, orderName, tossClientKey }: Props) {
  const router = useRouter();
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const busyRef = useRef(false);
  const widgetsRef = useRef<TossWidgets | null>(null);
  const total = useMemo(() => Math.max(subtotal - discount, 0), [subtotal, discount]);
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    if (!tossClientKey) return;

    let cancelled = false;
    let paymentMethods: { destroy?: () => Promise<void> } | null = null;

    async function initWidgets() {
      const toss = await loadTossPayments(tossClientKey);
      if (cancelled) return;
      const widgets = toss.widgets({
        customerKey: user.id.replace(/[^0-9a-zA-Z\-_=.@]/g, "").slice(0, 50) || "guest",
      });
      widgetsRef.current = widgets;
      await widgets.setAmount({ currency: "KRW", value: totalRef.current });
      if (cancelled) return;
      paymentMethods = await widgets.renderPaymentMethods({
        selector: "#toss-method",
        variantKey: "DEFAULT",
      });
      if (cancelled) return;
      await widgets.renderAgreement({
        selector: "#toss-agreement",
        variantKey: "AGREEMENT",
      });
      if (cancelled) return;
      setWidgetsReady(true);
    }

    initWidgets().catch((error) => {
      if (cancelled) return;
      const text = error instanceof Error ? error.message : "Toss 결제 위젯을 불러오지 못했습니다.";
      setMessage(text);
    });

    return () => {
      cancelled = true;
      widgetsRef.current = null;
      setWidgetsReady(false);
      void paymentMethods?.destroy?.();
    };
  }, [tossClientKey, user.id]);

  useEffect(() => {
    if (!widgetsReady || !widgetsRef.current) return;
    void widgetsRef.current.setAmount({ currency: "KRW", value: total });
  }, [total, widgetsReady]);

  async function onCoupon() {
    const result = await applyCoupon(couponCode, subtotal);
    if ("error" in result && result.error) {
      setDiscount(0);
      setMessage(result.error);
      return;
    }
    if (result.ok && result.discount) {
      setDiscount(result.discount);
      setCouponCode(result.code ?? couponCode);
      setMessage(`${result.name} 적용`);
    }
  }

  async function createOrder() {
    const form = document.getElementById("checkout-form") as HTMLFormElement;
    const formData = new FormData(form);
    formData.set("couponCode", couponCode);
    const created = await createPendingOrder(formData);
    if ("error" in created && created.error) {
      setMessage(created.error);
      return null;
    }
    if (!created.ok || !created.orderId) return null;
    return created;
  }

  async function withLock(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function payDemo() {
    await withLock(async () => {
      const created = await createOrder();
      if (!created) return;
      await completeDemoPayment(created.orderId);
      router.push(`/order/complete?orderId=${created.orderId}`);
    });
  }

  async function payToss() {
    await withLock(async () => {
      if (!widgetsRef.current) {
        setMessage("결제수단을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const created = await createOrder();
      if (!created) return;

      const phone = user.phone.replace(/\D/g, "");
      try {
        await widgetsRef.current.requestPayment({
          orderId: created.tossOrderId ?? created.orderId,
          orderName,
          successUrl: `${window.location.origin}/order/success?internalId=${created.orderId}`,
          failUrl: `${window.location.origin}/order/fail`,
          customerEmail: user.email,
          customerName: user.name,
          ...(phone.length >= 8 && phone.length <= 15 ? { customerMobilePhone: phone } : {}),
        });
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        const text =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : error && typeof error === "object" && "message" in error
                ? String((error as { message?: string }).message)
                : "결제를 완료하지 못했습니다.";
        if (
          code === "PAY_PROCESS_CANCELED" ||
          code === "PAY_PROCESS_ABORTED" ||
          code === "USER_CANCEL" ||
          text.includes("취소")
        ) {
          setMessage("결제를 취소했습니다. 결제수단을 다시 선택한 뒤 결제할 수 있습니다.");
          return;
        }
        setMessage(text);
      }
    });
  }

  return (
    <div>
      <form id="checkout-form" className="space-y-4">
        <FormField label="받는 분" htmlFor="receiver-name">
          <input id="receiver-name" className="field" name="receiverName" defaultValue={user.name} required />
        </FormField>
        <FormField label="연락처" htmlFor="receiver-phone">
          <input id="receiver-phone" className="field" name="receiverPhone" defaultValue={user.phone} required />
        </FormField>
        <PostcodeAddress
          zipCode={user.zipCode}
          address={user.address}
          addressDetail={user.addressDetail}
          required
        />
        <FormField label="배송 메모" htmlFor="memo">
          <textarea id="memo" className="field min-h-24" name="memo" placeholder="배송 메모" />
        </FormField>
      </form>
      <div className="mt-6 flex gap-2">
        <input
          className="field"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value)}
          placeholder="쿠폰 코드 THINGS10"
        />
        <button type="button" className="btn btn-ghost" onClick={onCoupon}>
          적용
        </button>
      </div>
      <p className="mt-4 text-sm">할인 {formatPrice(discount)}</p>
      <p className="text-lg">결제 금액 {formatPrice(total)}</p>
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      {tossClientKey ? (
        <div className="mt-8">
          <p className="mb-3 text-sm text-muted">결제수단을 선택한 뒤 Toss로 결제를 눌러 주세요.</p>
          <div id="toss-method" />
          <div id="toss-agreement" className="mt-3" />
        </div>
      ) : null}
      <div className="mt-8 grid gap-3">
        {tossClientKey ? (
          <button type="button" className="btn" disabled={busy || !widgetsReady} onClick={payToss}>
            Toss로 결제
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={payDemo}>
          데모 결제 (포트폴리오)
        </button>
      </div>
    </div>
  );
}
