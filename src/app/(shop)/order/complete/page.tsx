import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, ORDER_STATUS_LABEL } from "@/lib/utils";

export default async function OrderCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await requireUser();
  if (!session) redirect("/login");
  const { orderId } = await searchParams;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Complete</p>
      <h1 className="display mt-3 text-5xl">주문이 완료되었습니다</h1>
      <p className="mt-6 text-sm text-muted">{order.orderNumber}</p>
      <p className="mt-2 text-lg">{formatPrice(order.totalAmount)}</p>
      <p className="mt-2 text-sm">{ORDER_STATUS_LABEL[order.status]}</p>
      <ul className="mt-8 space-y-2 text-sm text-muted">
        {order.items.map((item) => (
          <li key={item.id}>
            <span className="product-name">{item.name}</span> × {item.quantity}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex justify-center gap-3">
        <Link href={`/mypage/orders/${order.id}`} className="btn">
          주문 상세
        </Link>
        <Link href="/" className="btn btn-ghost">
          쇼핑 계속
        </Link>
      </div>
    </div>
  );
}
