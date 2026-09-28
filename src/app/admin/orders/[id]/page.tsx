import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPrice, maskPersonalInfo, ORDER_STATUS_LABEL } from "@/lib/utils";
import { cancelOrder, updateOrderStatus } from "@/actions/commerce";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true, items: true },
  });
  if (!order) notFound();

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const statusDates = [
    { label: "주문 접수", date: order.createdAt },
    { label: "결제 완료", date: order.paidAt },
    { label: "상품 준비중", date: order.preparingAt },
    { label: "배송중", date: order.shippedAt },
    { label: "배송 완료", date: order.deliveredAt },
    { label: "취소", date: order.cancelledAt },
  ];

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <tr className="border-b border-line last:border-b-0">
      <th className="w-40 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-muted">{label}</th>
      <td className="px-4 py-3 text-sm">{children}</td>
    </tr>
  );

  return (
    <div>
      <h1 className="display text-4xl">주문 상세</h1>
      <p className="mt-3 text-sm text-muted">주문 정보, 상품, 배송지와 처리 이력을 확인합니다.</p>

      <section className="mt-8">
        <h2 className="text-base font-semibold">주문 정보</h2>
        <table className="mt-3 w-full border border-line bg-white">
          <tbody>
            <InfoRow label="주문번호">{order.orderNumber}</InfoRow>
            <InfoRow label="회원">{order.user.role === "WITHDRAWN" ? "탈퇴 회원" : maskPersonalInfo(order.user.email)}</InfoRow>
            <InfoRow label="주문일시">{formatDateTime(order.createdAt)}</InfoRow>
            <InfoRow label="현재 상태">{ORDER_STATUS_LABEL[order.status] ?? order.status}</InfoRow>
            <InfoRow label="결제수단">{order.paymentMethod}</InfoRow>
            <InfoRow label="쿠폰 코드">{order.couponCode ?? "-"}</InfoRow>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">주문 상품</h2>
        <div className="mt-3 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-muted">
              <tr><th className="px-4 py-3">상품명</th><th className="px-4 py-3 text-right">판매가</th><th className="px-4 py-3 text-right">구매수량</th><th className="px-4 py-3 text-right">증정수량</th><th className="px-4 py-3 text-right">총수량</th><th className="px-4 py-3 text-right">상품금액</th></tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(item.price)}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{item.freeQuantity}</td>
                  <td className="px-4 py-3 text-right">{item.quantity + item.freeQuantity}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line">
              <tr><th colSpan={5} className="px-4 py-3 text-right">상품 합계</th><td className="px-4 py-3 text-right">{formatPrice(subtotal)}</td></tr>
              <tr><th colSpan={5} className="px-4 py-3 text-right">쿠폰 할인</th><td className="px-4 py-3 text-right">-{formatPrice(order.discountAmount)}</td></tr>
              <tr className="bg-slate-50"><th colSpan={5} className="px-4 py-3 text-right">최종 결제금액</th><td className="px-4 py-3 text-right font-bold">{formatPrice(order.totalAmount)}</td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="text-base font-semibold">배송 정보</h2>
          <table className="mt-3 w-full border border-line bg-white"><tbody>
            <InfoRow label="받는 분">{maskPersonalInfo(order.receiverName)}</InfoRow>
            <InfoRow label="연락처">{maskPersonalInfo(order.receiverPhone)}</InfoRow>
            <InfoRow label="우편번호">{maskPersonalInfo(order.zipCode)}</InfoRow>
            <InfoRow label="주소">{maskPersonalInfo(order.address)} {maskPersonalInfo(order.addressDetail)}</InfoRow>
            <InfoRow label="배송 메모">{order.memo || "-"}</InfoRow>
          </tbody></table>
        </section>
        <section>
          <h2 className="text-base font-semibold">구매 상태별 처리일시</h2>
          <table className="mt-3 w-full border border-line bg-white"><tbody>
            {statusDates.map((entry) => <InfoRow key={entry.label} label={entry.label}>{entry.date ? formatDateTime(entry.date) : "-"}</InfoRow>)}
          </tbody></table>
        </section>
      </div>
      <form action={updateOrderStatus} className="mt-8 flex gap-3">
        <input type="hidden" name="id" value={order.id} />
        <select className="field max-w-xs" name="status" defaultValue={order.status}>
          {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn">상태 변경</button>
      </form>
      <form action={cancelOrder} className="mt-3">
        <input type="hidden" name="id" value={order.id} />
        <button className="btn btn-ghost">주문 취소</button>
      </form>
    </div>
  );
}
