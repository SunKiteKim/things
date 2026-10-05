"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { completeDemoPayment, createPendingOrder, selectCartCoupon } from "@/actions/commerce";
import { formatPrice } from "@/lib/utils";
import { FormField } from "@/components/form-field";
import { PostcodeAddress } from "@/components/postcode-address";
import { CouponPicker, type CouponOption } from "@/components/cart-coupon";
import { couponCodes, shippingFee, SHIPPING_NOTICE } from "@/lib/checkout-pricing";

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
  initialCoupon?: { code: string; discount: number };
  couponOptions: CouponOption[];
  subtotal: number;
  orderName: string;
  tossClientKey: string;
  items: { id: string; name: string; quantity: number; onePlusOne: boolean; amount: number }[];
};

export function CheckoutClient({ user, subtotal, orderName, tossClientKey, initialCoupon, couponOptions, items }: Props) {
  const router = useRouter();
  const [discount, setDiscount] = useState(initialCoupon?.discount ?? 0);
  const [appliedCode, setAppliedCode] = useState(initialCoupon?.code ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const busyRef = useRef(false);
  const widgetsRef = useRef<TossWidgets | null>(null);
  const shipping = shippingFee(Math.max(subtotal - discount, 0));
  const total = useMemo(() => Math.max(subtotal - discount, 0) + shipping, [subtotal, discount, shipping]);
  const discountLines = useMemo(() => {
    let remaining = discount;
    return couponOptions
      .filter((option) => couponCodes(appliedCode).includes(option.code))
      .map((option) => {
        const amount = Math.min(Math.max(option.discount, 0), remaining);
        remaining -= amount;
        return { code: option.code, label: option.label, amount };
      })
      .filter((line) => line.amount > 0);
  }, [appliedCode, couponOptions, discount]);
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

  async function createOrder() {
    const form = document.getElementById("checkout-form") as HTMLFormElement;
    const formData = new FormData(form);
    formData.set("couponCode", appliedCode);
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
      const paid = await completeDemoPayment(created.orderId);
      if (paid.error) { setMessage(paid.error); return; }
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
      await widgetsRef.current.setAmount({ currency: "KRW", value: created.amount! });

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
    <>
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
      <CouponPicker options={couponOptions} selected={appliedCode} subtotal={subtotal} onApply={async (option) => { const result = await selectCartCoupon(option.code || "-", "checkout"); if ("error" in result && result.error) throw new Error(result.error); setDiscount(option.discount); setAppliedCode(option.code); setMessage(`${option.label} 적용`); }} />
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      {tossClientKey ? (
        <div className="mt-8">
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
    <aside className="h-fit border border-line bg-surface p-6">
      <p className="text-sm text-muted">주문 상품</p>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4">
            <span>
              <span className="product-name">{item.name}</span> × {item.quantity}{item.onePlusOne ? ` (1+1 증정 ${item.quantity}개)` : ""}
            </span>
            <span>{formatPrice(item.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex justify-between text-base">
        <span>상품금액 합계</span>
        <span className="font-bold">{formatPrice(subtotal)}</span>
      </p>
      <p className="mt-3 flex justify-between text-base">
        <span>할인금액 합계</span>
        <span className="text-[#e10600]">{discount > 0 ? `-${formatPrice(discount)}` : formatPrice(discount)}</span>
      </p>
      {discountLines.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {discountLines.map((line) => (
            <li key={line.code} className="flex justify-between gap-4">
              <span>&gt; {line.label}</span>
              <span>{formatPrice(line.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 flex justify-between text-base">
        <span>배송비</span>
        <span>{formatPrice(shipping)}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{SHIPPING_NOTICE}</p>
      <p className="mt-5 flex justify-between text-2xl font-bold text-[#e10600]">
        <span>최종 결제금액</span>
        <span>{formatPrice(total)}</span>
      </p>
    </aside>
    </>
  );
}
