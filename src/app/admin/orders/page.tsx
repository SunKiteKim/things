import { prisma } from "@/lib/prisma";
import { AdminOrdersTable } from "@/components/admin-orders-table";
import { formatDate, formatPrice, maskEmail, maskPersonalInfo, ORDER_STATUS_LABEL } from "@/lib/utils";

export default async function OrdersAdminPage() {
  const orders = await prisma.order.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="display text-4xl">주문관리</h1>
      <AdminOrdersTable
        rows={orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          email: order.user.role === "WITHDRAWN" ? "-" : maskEmail(order.user.email),
          name: order.user.role === "WITHDRAWN" ? "탈퇴 회원" : maskPersonalInfo(order.user.name),
          amount: formatPrice(order.totalAmount),
          status: ORDER_STATUS_LABEL[order.status] ?? order.status,
          createdAt: order.createdAt.getTime(),
          createdLabel: formatDate(order.createdAt),
        }))}
      />
    </div>
  );
}
