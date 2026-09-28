import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPrice, ORDER_STATUS, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import { cancelOrder, requestOrderAfterSale } from "@/actions/commerce";

export default async function MyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  if (!session) redirect("/login");
  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  });
  if (!order) notFound();
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cancellableStatuses: string[] = [ORDER_STATUS.PENDING, ORDER_STATUS.PAID, ORDER_STATUS.PREPARING, ORDER_STATUS.SHIPPED];
  const cancellable = cancellableStatuses.includes(order.status);

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => <tr className="border-b border-line last:border-b-0"><th className="w-36 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-muted">{label}</th><td className="px-4 py-3 text-sm">{children}</td></tr>;

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Order</p>
      <h1 className="display mt-3 text-5xl">주문상세</h1>
      <table className="mt-8 w-full border border-line bg-white"><tbody>
        <InfoRow label="주문번호">{order.orderNumber}</InfoRow><InfoRow label="주문일시">{formatDateTime(order.createdAt)}</InfoRow><InfoRow label="주문상태">{ORDER_STATUS_LABEL[order.status] ?? order.status}</InfoRow><InfoRow label="결제수단">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</InfoRow><InfoRow label="운송장번호">{order.trackingNumber ?? "-"}</InfoRow>
      </tbody></table>
      <div className="mt-8 overflow-x-auto border border-line bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr><th className="px-4 py-3">상품명</th><th className="px-4 py-3 text-right">판매가</th><th className="px-4 py-3 text-right">구매수량</th><th className="px-4 py-3 text-right">증정수량</th><th className="px-4 py-3 text-right">상품금액</th></tr></thead><tbody>
        {order.items.map((item) => <tr key={item.id} className="border-t border-line"><td className="px-4 py-3 font-semibold">{item.name}</td><td className="px-4 py-3 text-right">{formatPrice(item.price)}</td><td className="px-4 py-3 text-right">{item.quantity}</td><td className="px-4 py-3 text-right">{item.freeQuantity}</td><td className="px-4 py-3 text-right">{formatPrice(item.price * item.quantity)}</td></tr>)}
      </tbody><tfoot className="border-t border-line"><tr><th colSpan={4} className="px-4 py-3 text-right">상품 합계</th><td className="px-4 py-3 text-right">{formatPrice(subtotal)}</td></tr><tr><th colSpan={4} className="px-4 py-3 text-right">할인</th><td className="px-4 py-3 text-right">-{formatPrice(order.discountAmount)}</td></tr><tr className="bg-slate-50"><th colSpan={4} className="px-4 py-3 text-right">결제 금액</th><td className="px-4 py-3 text-right font-bold">{formatPrice(order.totalAmount)}</td></tr></tfoot></table></div>
      <table className="mt-8 w-full border border-line bg-white"><tbody><InfoRow label="받는 분">{order.receiverName}</InfoRow><InfoRow label="연락처">{order.receiverPhone}</InfoRow><InfoRow label="주소">({order.zipCode}) {order.address} {order.addressDetail}</InfoRow><InfoRow label="배송 메모">{order.memo || "-"}</InfoRow></tbody></table>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/mypage/orders" className="btn btn-ghost">뒤로가기</Link>
        {cancellable ? <form action={cancelOrder}><input type="hidden" name="id" value={order.id} /><button className="btn btn-ghost">주문 취소</button></form> : null}
        {order.status === ORDER_STATUS.DELIVERED ? <><form action={requestOrderAfterSale}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="requestType" value="RETURN" /><button className="btn">반품 신청</button></form><form action={requestOrderAfterSale}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="requestType" value="EXCHANGE" /><button className="btn btn-ghost">교환 신청</button></form></> : null}
      </div>
    </div>
  );
}
