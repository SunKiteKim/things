import { prisma } from "@/lib/prisma";
import { createCoupon, deleteCoupon, updateCoupon } from "@/actions/promotions";

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function CouponsAdminPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="display text-4xl">쿠폰관리</h1>
      <form action={createCoupon} className="mt-8 grid gap-3 border border-line bg-surface p-6 md:grid-cols-2">
        <input className="field" name="code" placeholder="CODE" required />
        <input className="field" name="name" placeholder="쿠폰명" required />
        <select className="field" name="discountType" defaultValue="PERCENT">
          <option value="PERCENT">정률 %</option>
          <option value="AMOUNT">정액 원</option>
        </select>
        <input className="field" name="discountValue" type="number" placeholder="할인값" required />
        <input className="field" name="minOrderAmount" type="number" placeholder="최소 주문금액" defaultValue="0" />
        <input className="field" name="maxUses" type="number" placeholder="최대 사용 횟수" />
        <input className="field" name="startAt" type="datetime-local" required />
        <input className="field" name="endAt" type="datetime-local" required />
        <label className="text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> 사용 가능
        </label>
        <button className="btn">쿠폰 등록</button>
      </form>
      <div className="mt-8 space-y-6">
        {coupons.map((coupon) => (
          <form key={coupon.id} action={updateCoupon} className="grid gap-3 border border-line p-5 md:grid-cols-2">
            <input type="hidden" name="id" value={coupon.id} />
            <input className="field" name="code" defaultValue={coupon.code} />
            <input className="field" name="name" defaultValue={coupon.name} />
            <select className="field" name="discountType" defaultValue={coupon.discountType}>
              <option value="PERCENT">정률 %</option>
              <option value="AMOUNT">정액 원</option>
            </select>
            <input className="field" name="discountValue" type="number" defaultValue={coupon.discountValue} />
            <input className="field" name="minOrderAmount" type="number" defaultValue={coupon.minOrderAmount} />
            <input className="field" name="maxUses" type="number" defaultValue={coupon.maxUses ?? 0} />
            <input className="field" name="startAt" type="datetime-local" defaultValue={localInput(coupon.startAt)} />
            <input className="field" name="endAt" type="datetime-local" defaultValue={localInput(coupon.endAt)} />
            <label className="text-sm">
              <input type="checkbox" name="isActive" defaultChecked={coupon.isActive} /> 사용 가능 · 사용 {coupon.usedCount}
            </label>
            <div className="flex gap-2">
              <button className="btn">수정</button>
              <button className="btn btn-ghost" formAction={deleteCoupon}>
                삭제
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
