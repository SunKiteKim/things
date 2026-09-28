"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/commerce";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/utils";

export function AdminOrderStatusForm({ id, currentStatus, trackingNumber }: { id: string; currentStatus: string; trackingNumber: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const afterSaleAllowed = currentStatus === ORDER_STATUS.DELIVERED || currentStatus === ORDER_STATUS.RETURNED || currentStatus === ORDER_STATUS.EXCHANGED;
  const options = Object.entries(ORDER_STATUS_LABEL).filter(([value]) => (value !== ORDER_STATUS.RETURNED && value !== ORDER_STATUS.EXCHANGED) || afterSaleAllowed);

  function submit(formData: FormData) {
    startTransition(async () => {
      setError("");
      const result = await updateOrderStatus(formData);
      if (!result?.ok) {
        setError(result?.error ?? "주문 상태를 변경하지 못했습니다.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={submit} className="mt-8 grid max-w-2xl gap-4 border-t border-line pt-6">
      <input type="hidden" name="id" value={id} />
      <label className="text-sm font-medium">주문 상태
        <select className="field mt-2" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">운송장번호 {status === ORDER_STATUS.DELIVERED ? <span className="text-accent">(필수)</span> : null}
        <input className="field mt-2" name="trackingNumber" defaultValue={trackingNumber} required={status === ORDER_STATUS.DELIVERED} placeholder="배송 완료 처리 시 운송장번호 입력" />
      </label>
      {error ? <p className="text-sm text-accent" role="alert">{error}</p> : null}
      <button className="btn w-fit" disabled={pending}>{pending ? "변경 중…" : "상태 변경"}</button>
    </form>
  );
}
