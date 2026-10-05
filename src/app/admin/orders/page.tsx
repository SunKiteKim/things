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
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-3">No</th>
            <th>주문번호</th>
            <th>회원</th>
            <th>금액</th>
            <th>상태</th>
            <th>일시</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr key={order.id} className="border-b border-line">
              <td className="py-4">{index + 1}</td>
              <td>
                <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
              </td>
              <td>{order.user.role === "WITHDRAWN" ? "탈퇴 회원" : maskEmail(order.user.email)}</td>
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
