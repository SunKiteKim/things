import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, maskEmail, ORDER_STATUS_LABEL } from "@/lib/utils";

export default async function OrdersAdminPage() {
  const orders = await prisma.order.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="display text-4xl">주문관리</h1>
      <p className="mt-2 text-sm text-muted">생성은 고객 결제 흐름에서만 이루어집니다. 조회·상태변경·취소만 가능합니다.</p>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-3">주문번호</th>
            <th>회원</th>
            <th>금액</th>
            <th>상태</th>
            <th>일시</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-line">
              <td className="py-4">
                <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
              </td>
              <td>{maskEmail(order.user.email)}</td>
              <td>{formatPrice(order.totalAmount)}</td>
              <td>{ORDER_STATUS_LABEL[order.status]}</td>
              <td>{formatDate(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
