import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPrice, maskPersonalInfo, ORDER_STATUS, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import { cancelOrder, completeOrderAfterSale, confirmOrderCollection, requestOrderAfterSale } from "@/actions/commerce";
import { AdminOrderStatusForm } from "@/components/admin-order-status-form";
import { ProductImage } from "@/components/product-image";

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
  try {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const statusDates = [
    { label: "주문 접수", date: order.createdAt },
    { label: "결제 완료", date: order.paidAt },
    { label: "상품 준비중", date: order.preparingAt },
    { label: "배송중", date: order.shippedAt },
    { label: "배송 완료", date: order.deliveredAt },
    { label: "취소", date: order.cancelledAt },
    { label: "반품 신청", date: order.returnRequestedAt },
    { label: "교환 신청", date: order.exchangeRequestedAt },
    { label: "물품 회수 확인", date: order.collectionConfirmedAt },
    { label: "반품 완료", date: order.returnedAt },
    { label: "교환 상품 발송", date: order.exchangedAt },
  ];

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <tr className="border-b border-line last:border-b-0">
      <th className="w-40 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-muted">{label}</th>
      <td className="px-4 py-3 text-sm">{children}</td>
    </tr>
  );

  return (
    <div>
      <Link href="/admin/orders" className="btn btn-ghost">뒤로가기</Link>
      <h1 className="display mt-4 text-4xl">주문 상세</h1>
      <p className="mt-3 text-sm text-muted">주문 정보, 상품, 배송지와 처리 이력을 확인합니다.</p>

      <section className="mt-8">
        <h2 className="text-base font-semibold">주문 정보</h2>
        <table className="mt-3 w-full border border-line bg-white">
          <tbody>
            <InfoRow label="주문번호">{order.orderNumber}</InfoRow>
            <InfoRow label="회원">{order.user.role === "WITHDRAWN" ? "탈퇴 회원" : maskPersonalInfo(order.user.email)}</InfoRow>
            <InfoRow label="주문일시">{formatDateTime(order.createdAt)}</InfoRow>
            <InfoRow label="현재 상태">{ORDER_STATUS_LABEL[order.status] ?? order.status}</InfoRow>
            <InfoRow label="결제수단">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</InfoRow>
            <InfoRow label="쿠폰 코드">{order.couponCode ?? "-"}</InfoRow>
            <InfoRow label="운송장번호">{order.trackingNumber ?? "-"}</InfoRow>
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
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3 font-semibold">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden bg-surface">
                        <ProductImage src={item.imageUrl} alt="" fill />
                      </span>
                      {item.name}
                    </span>
                  </td>
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
      <AdminOrderStatusForm id={order.id} currentStatus={order.status} trackingNumber={order.trackingNumber ?? ""} />
      <div className="mt-3 flex flex-wrap gap-3">
        <form action={cancelOrder}><input type="hidden" name="id" value={order.id} /><button className="btn btn-ghost">주문 취소</button></form>
        {order.status === ORDER_STATUS.DELIVERED ? <>
          <form action={requestOrderAfterSale}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="requestType" value="RETURN" /><button className="btn btn-ghost">반품 신청</button></form>
          <form action={requestOrderAfterSale}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="requestType" value="EXCHANGE" /><button className="btn btn-ghost">교환 신청</button></form>
        </> : null}
      </div>
      {order.status === ORDER_STATUS.RETURN_REQUESTED || order.status === ORDER_STATUS.EXCHANGE_REQUESTED ? (
        <section className="mt-8 max-w-2xl border border-line bg-white p-5">
          <h2 className="font-semibold">교환·반품 회수 처리</h2>
          {!order.collectionConfirmedAt ? (
            <form action={confirmOrderCollection} className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={order.id} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="collectionConfirmed" required /> 물품 회수 완료 확인</label>
              <button className="btn btn-ghost">회수 확인 저장</button>
            </form>
          ) : (
            <form action={completeOrderAfterSale} className="mt-4">
              <input type="hidden" name="id" value={order.id} />
              <p className="mb-3 text-sm text-muted">회수 확인: {formatDateTime(order.collectionConfirmedAt)}</p>
              <button className="btn">{order.status === ORDER_STATUS.RETURN_REQUESTED ? "반품 완료" : "교환 상품 보내기"}</button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
  } catch (error) {
    const message = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    return <pre className="whitespace-pre-wrap text-sm">{message}</pre>;
  }
}
