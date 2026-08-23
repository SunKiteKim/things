import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPrice, ORDER_STATUS_LABEL } from "@/lib/utils";
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

  return (
    <div>
      <h1 className="display text-4xl">주문 상세</h1>
      <p className="mt-3 text-sm text-muted">
        {order.orderNumber} · {order.user.email} · {formatDate(order.createdAt)}
      </p>
      <ul className="mt-8 space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            <span className="product-name">{item.name}</span> × {item.quantity} · {formatPrice(item.price * item.quantity)}
          </li>
        ))}
      </ul>
      <p className="mt-6">합계 {formatPrice(order.totalAmount)}</p>
      <p className="text-sm text-muted">
        {order.receiverName} / {order.receiverPhone}
        <br />
        {order.zipCode} {order.address} {order.addressDetail}
      </p>
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
