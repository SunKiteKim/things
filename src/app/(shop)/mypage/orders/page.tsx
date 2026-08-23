import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, formatOrderDateTime, formatPrice, ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/utils";

export default async function MyOrdersPage() {
  const session = await requireUser();
  if (!session) redirect("/login");
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="display text-5xl">주문조회</h1>
      {orders.length === 0 ? (
        <p className="mt-10 py-10 text-muted">주문 내역이 없습니다.</p>
      ) : (
        <div className="mt-10 space-y-12">
          {orders.map((order) => (
            <article key={order.id} className="border-b border-line pb-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm">
                  <span className="text-base font-bold">{formatOrderDateTime(order.createdAt)}</span>
                  <span className="ml-4 text-muted">주문번호 {order.orderNumber}</span>
                </p>
                <Link href={`/mypage/orders/${order.id}`} className="text-sm">
                  주문/배송 상세보기 &gt;
                </Link>
              </div>
              <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_140px_120px] bg-[#f5f5f5] px-4 py-2 text-xs text-muted md:grid">
                <span>제품정보</span>
                <span className="text-center">결제금액</span>
                <span className="text-right">진행상태</span>
              </div>
              <div className="divide-y divide-line">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_140px_120px] md:items-center md:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-surface">
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      </div>
                      <p className="product-name text-sm leading-6">{item.name}</p>
                    </div>
                    <div className="text-sm md:text-center">
                      <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                      <p className="mt-1 text-muted">{item.quantity}개</p>
                    </div>
                    <p
                      className={cn(
                        "text-sm md:text-right",
                        order.status === ORDER_STATUS.CANCELLED ? "font-bold text-[#c23b3b]" : "font-bold",
                      )}
                    >
                      {ORDER_STATUS_LABEL[order.status]}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
