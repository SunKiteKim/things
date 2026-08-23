import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPrice, ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/utils";
import { cancelOrder } from "@/actions/commerce";

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

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Order</p>
      <h1 className="display mt-3 text-5xl">주문상세</h1>
      <p className="mt-3 text-sm text-muted">
        {order.orderNumber} · {formatDateTime(order.createdAt)} · {ORDER_STATUS_LABEL[order.status]}
      </p>
      <div className="mt-10 space-y-5">
        {order.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[80px_1fr] gap-4">
            <div className="relative aspect-square overflow-hidden bg-surface">
              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
            </div>
            <div className="text-sm">
              <p className="product-name">{item.name}</p>
              <p className="text-muted">
                {formatPrice(item.price)} × {item.quantity}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 max-w-md space-y-2 text-sm">
        <p>받는 분 {order.receiverName} / {order.receiverPhone}</p>
        <p>
          {order.zipCode} {order.address} {order.addressDetail}
        </p>
        <p>결제 {formatPrice(order.totalAmount)}</p>
      </div>
      {order.status !== ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.DELIVERED ? (
        <form action={cancelOrder} className="mt-8">
          <input type="hidden" name="id" value={order.id} />
          <button className="btn btn-ghost">주문 취소</button>
        </form>
      ) : null}
    </div>
  );
}
