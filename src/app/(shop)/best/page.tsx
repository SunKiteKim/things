import { prisma } from "@/lib/prisma";
import { ORDER_STATUS } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";

const SOLD_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

export default async function BestPage() {
  const [products, sold] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: {
        order: { status: { in: [...SOLD_STATUSES] } },
      },
    }),
  ]);

  const soldMap = new Map(sold.map((row) => [row.productId, row._sum.quantity ?? 0]));
  const ranked = [...products].sort((left, right) => {
    const diff = (soldMap.get(right.id) ?? 0) - (soldMap.get(left.id) ?? 0);
    if (diff !== 0) return diff;
    return right.registeredAt.getTime() - left.registeredAt.getTime();
  });

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Best</p>
      <h1 className="display mt-3 text-5xl">Best</h1>
      <p className="mt-3 text-muted">판매량 순으로 정렬한 제품 {ranked.length}개</p>
      {ranked.length === 0 ? (
        <p className="mt-16 text-muted">등록된 제품이 없습니다.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {ranked.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
