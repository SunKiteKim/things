import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductImage } from "@/components/product-image";
import { formatDate, formatPrice, ORDER_STATUS, ORDER_STATUS_LABEL } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { priceProducts } from "@/lib/exhibition-offers";

const SUMMARY = [
  { key: "PAID", label: "결제 완료", statuses: [ORDER_STATUS.PAID] },
  { key: "PREPARING", label: "상품 준비중", statuses: [ORDER_STATUS.PREPARING] },
  { key: "SHIPPED", label: "배송중", statuses: [ORDER_STATUS.SHIPPED] },
  { key: "DELIVERED", label: "배송 완료", statuses: [ORDER_STATUS.DELIVERED] },
] as const;

export default async function MyPage() {
  const session = await requireUser();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { items: true },
      },
      wishlistItems: {
        orderBy: { createdAt: "desc" },
        include: { product: true },
      },
    },
  });
  if (!user) redirect("/login");
  const wishlistProducts = await priceProducts(user.wishlistItems.map((item) => item.product));
  const wishlistById = new Map(wishlistProducts.map((product) => [product.id, product]));
  if (user.provider !== "credentials" && !user.phone) redirect("/mypage/phone");

  const counts = await prisma.order.groupBy({
    by: ["status"],
    where: { userId: user.id },
    _count: { _all: true },
  });
  const countByStatus = new Map(counts.map((item) => [item.status, item._count._all]));

  return (
    <section>
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">My things</p>
      <h1 className="display mt-2 text-4xl md:text-5xl">{user.name}님,</h1>
      <p className="mt-3 text-sm text-muted">현재 로그인한 계정은 {user.email}입니다.</p>

      <div className="mt-9 rounded-2xl border border-line p-5 md:p-7">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-muted">나의 주문</p>
            <p className="mt-2 text-xl font-bold">최근 주문 현황</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-y-6 sm:grid-cols-4 lg:max-w-3xl">
            {SUMMARY.map((item, index) => (
              <div key={item.key} className={`text-center ${index ? "sm:border-l sm:border-line" : ""}`}>
                <p className="text-xs text-muted">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">
                  {item.statuses.reduce((sum, status) => sum + (countByStatus.get(status) ?? 0), 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <div><p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">Wishlist</p><h2 className="display mt-2 text-2xl">위시리스트</h2></div>
        <span className="text-sm text-muted">{user.wishlistItems.length}개</span>
      </div>
      {user.wishlistItems.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {user.wishlistItems.map((item) => <ProductCard key={item.id} product={wishlistById.get(item.productId) ?? item.product} showDiscountRate showProductId />)}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-[#f6f6f4] px-6 py-10 text-center text-sm text-muted">위시리스트에 담긴 상품이 없습니다.</div>
      )}

      <div className="mt-12 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">Recent orders</p>
          <h2 className="display mt-2 text-2xl">최근 주문조회</h2>
        </div>
        <Link href="/mypage/orders" className="text-sm underline underline-offset-4">전체보기</Link>
      </div>

      {user.orders.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#f6f6f4] px-6 py-12 text-center text-sm text-muted">
          아직 주문 내역이 없습니다.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {user.orders.map((order) => {
            const firstItem = order.items[0];
            const extraCount = order.items.length - 1;
            return (
              <Link key={order.id} href={`/mypage/orders/${order.id}`} className="flex gap-4 rounded-2xl bg-[#f6f6f4] p-4 transition hover:bg-[#efefec]">
                {firstItem ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
                    <ProductImage src={firstItem.imageUrl} alt={firstItem.name} fill />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{ORDER_STATUS_LABEL[order.status]}</span>
                    <span className="text-xs text-muted">{formatDate(order.createdAt)}</span>
                  </div>
                  <p className="mt-3 truncate text-sm font-bold">
                    {firstItem?.name ?? "주문 상품"}{extraCount > 0 ? ` 외 ${extraCount}건` : ""}
                  </p>
                  <p className="mt-2 text-sm text-muted">{formatPrice(order.totalAmount)} · {order.orderNumber}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
