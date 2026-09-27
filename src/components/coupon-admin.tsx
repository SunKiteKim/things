"use client";

import { useState, useTransition } from "react";
import { createCoupon, deleteCoupon, updateCoupon } from "@/actions/promotions";
import { formatPrice } from "@/lib/utils";

type CouponView = {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  minQuantity: number;
  maxUses: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
};

function localInput(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="admin-row">
      <label htmlFor={htmlFor}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function CouponFields({ prefix, coupon }: { prefix: string; coupon?: CouponView }) {
  return (
    <div className="grid gap-4">
      <Field label="쿠폰 코드" htmlFor={`${prefix}-code`}>
        <input id={`${prefix}-code`} className="field" name="code" defaultValue={coupon?.code} required />
      </Field>
      <Field label="쿠폰명" htmlFor={`${prefix}-name`}>
        <input id={`${prefix}-name`} className="field" name="name" defaultValue={coupon?.name} required />
      </Field>
      <Field label="할인 방식" htmlFor={`${prefix}-discountType`}>
        <select id={`${prefix}-discountType`} className="field" name="discountType" defaultValue={coupon?.discountType ?? "PERCENT"}>
          <option value="PERCENT">정률 할인 (%)</option>
          <option value="AMOUNT">정액 할인 (원)</option>
        </select>
      </Field>
      <Field label="할인값" htmlFor={`${prefix}-discountValue`}>
        <input id={`${prefix}-discountValue`} className="field" name="discountValue" type="number" min={1} defaultValue={coupon?.discountValue} required />
      </Field>
      <Field label="최소 주문금액" htmlFor={`${prefix}-minOrderAmount`}>
        <input id={`${prefix}-minOrderAmount`} className="field" name="minOrderAmount" type="number" min={0} defaultValue={coupon?.minOrderAmount ?? 0} />
      </Field>
      <Field label="최소 구매수량" htmlFor={`${prefix}-minQuantity`}>
        <input id={`${prefix}-minQuantity`} className="field" name="minQuantity" type="number" min={0} step={1} defaultValue={coupon?.minQuantity ?? 0} />
      </Field>
      <Field label="최대 사용횟수" htmlFor={`${prefix}-maxUses`}>
        <input id={`${prefix}-maxUses`} className="field" name="maxUses" type="number" min={0} defaultValue={coupon?.maxUses ?? 0} />
      </Field>
      <Field label="사용 시작일" htmlFor={`${prefix}-startAt`}>
        <input id={`${prefix}-startAt`} className="field" name="startAt" type="datetime-local" defaultValue={coupon ? localInput(coupon.startAt) : undefined} required />
      </Field>
      <Field label="사용 종료일" htmlFor={`${prefix}-endAt`}>
        <input id={`${prefix}-endAt`} className="field" name="endAt" type="datetime-local" defaultValue={coupon ? localInput(coupon.endAt) : undefined} required />
      </Field>
      <Field label="사용 여부" htmlFor={`${prefix}-isActive`}>
        <label className="flex min-h-[3.2rem] items-center gap-2 text-sm">
          <input id={`${prefix}-isActive`} name="isActive" type="checkbox" defaultChecked={coupon?.isActive ?? true} />
          사용 가능{coupon ? ` · 현재 ${coupon.usedCount}회 사용` : ""}
        </label>
      </Field>
    </div>
  );
}

function discountLabel(coupon: CouponView) {
  return coupon.discountType === "PERCENT"
    ? `${coupon.discountValue}% 할인`
    : `${formatPrice(coupon.discountValue)} 할인`;
}

export function CouponAdmin({ coupons }: { coupons: CouponView[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(coupons[0]?.id ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = coupons.find((coupon) => coupon.id === selectedId) ?? coupons[0];

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      setError("");
      try {
        await createCoupon(formData);
        setOpen(false);
      } catch {
        setError("쿠폰 정보를 확인해 주세요. 동일한 쿠폰 코드가 이미 있을 수 있습니다.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl">쿠폰관리</h1>
          <p className="mt-2 text-sm text-muted">등록된 쿠폰을 선택하면 하단에서 상세 내용을 확인하고 수정할 수 있습니다.</p>
        </div>
        <button type="button" className="btn shrink-0" onClick={() => { setError(""); setOpen(true); }}>
          쿠폰등록
        </button>
      </div>

      {coupons.length ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="tablist" aria-label="등록 쿠폰">
            {coupons.map((coupon) => {
              const active = selected?.id === coupon.id;
              return (
                <button
                  key={coupon.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="coupon-detail-panel"
                  className={`min-h-40 border p-5 text-left transition ${active ? "border-ink bg-[#f2f2f0]" : "border-line bg-white hover:border-ink"}`}
                  onClick={() => setSelectedId(coupon.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold">{coupon.name}</p>
                    <span className={`text-xs ${coupon.isActive ? "text-accent" : "text-muted"}`}>{coupon.isActive ? "사용 가능" : "사용 중지"}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{coupon.code}</p>
                  <p className="mt-6 text-xl">{discountLabel(coupon)}</p>
                  <p className="mt-2 text-xs text-muted">사용 {coupon.usedCount}회{coupon.maxUses ? ` / ${coupon.maxUses}회` : " · 제한 없음"}</p>
                </button>
              );
            })}
          </div>

          {selected ? (
            <section id="coupon-detail-panel" role="tabpanel" className="mt-8 border border-line bg-white p-6 md:p-8">
              <div className="mb-7 border-b border-line pb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Coupon detail</p>
                <h2 className="mt-2 text-2xl font-bold">{selected.name}</h2>
              </div>
              <form key={selected.id} action={updateCoupon} className="grid max-w-3xl gap-6">
                <input type="hidden" name="id" value={selected.id} />
                <CouponFields prefix={`edit-${selected.id}`} coupon={selected} />
                <div className="admin-row">
                  <span />
                  <div className="flex gap-3">
                    <button className="btn">쿠폰 수정</button>
                    <button className="btn btn-ghost" formAction={deleteCoupon}>쿠폰 삭제</button>
                  </div>
                </div>
              </form>
            </section>
          ) : null}
        </>
      ) : (
        <div className="mt-8 border border-dashed border-line bg-[#f7f7f5] px-6 py-16 text-center text-sm text-muted">
          등록된 쿠폰이 없습니다. 쿠폰등록 버튼으로 첫 쿠폰을 만들어 보세요.
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 px-5 py-10" role="presentation">
          <div className="w-full max-w-3xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="coupon-create-title">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 id="coupon-create-title" className="text-2xl font-bold">쿠폰 등록</h2>
              <button type="button" className="text-2xl leading-none" aria-label="쿠폰 등록 닫기" onClick={() => setOpen(false)}>×</button>
            </div>
            <form action={submitCreate} className="max-h-[75vh] overflow-y-auto p-6 md:p-8">
              <CouponFields prefix="create" />
              {error ? <p className="mt-5 text-sm text-accent" role="alert">{error}</p> : null}
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button>
                <button className="btn" disabled={pending}>{pending ? "등록 중…" : "쿠폰 등록"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
