"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/commerce";
import { RequiredMark } from "@/components/required-mark";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/utils";

export function AdminOrderStatusForm({ id, currentStatus, trackingNumber }: { id: string; currentStatus: string; trackingNumber: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const afterSaleStatuses: string[] = [ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.EXCHANGE_REQUESTED, ORDER_STATUS.RETURNED, ORDER_STATUS.EXCHANGED];
  const options = Object.entries(ORDER_STATUS_LABEL).filter(([value]) => !afterSaleStatuses.includes(value));

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
      <label className="text-sm font-medium">운송장번호{status === ORDER_STATUS.DELIVERED ? <RequiredMark /> : null}
        <input className="field mt-2" name="trackingNumber" defaultValue={trackingNumber} required={status === ORDER_STATUS.DELIVERED} placeholder="배송 완료 처리 시 운송장번호 입력" />
      </label>
      {error ? <p className="text-sm text-accent" role="alert">{error}</p> : null}
      <button className="btn w-fit" disabled={pending}>{pending ? "변경 중…" : "상태 변경"}</button>
    </form>
  );
}
