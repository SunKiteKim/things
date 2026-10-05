import { prisma } from "@/lib/prisma";
import { priceProducts } from "@/lib/exhibition-offers";
import { ORDER_STATUS } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { loadPageDisplay } from "@/lib/display";

const SOLD_STATUSES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

export default async function BestPage() {
  const [catalog, sold, display] = await Promise.all([
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
    loadPageDisplay("best"),
  ]);

  const products = await priceProducts(catalog);
  const productById = new Map(products.map((product) => [product.id, product]));
  const soldMap = new Map(sold.map((row) => [row.productId, row._sum.quantity ?? 0]));
  const ranked = display
    .filter((item) => item.kind === "product" && item.isVisible)
    .flatMap((item) => {
      const product = productById.get(item.refId);
      return product ? [product] : [];
    })
    .sort((left, right) => {
      const diff = (soldMap.get(right.id) ?? 0) - (soldMap.get(left.id) ?? 0);
      if (diff !== 0) return diff;
      return right.registeredAt.getTime() - left.registeredAt.getTime();
    });

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Best</p>
      <h1 className="display mt-3 text-5xl">Best</h1>
      <p className="mt-3 text-muted">전시에 등록한 제품 {ranked.length}개 · 판매량 순</p>
      {ranked.length === 0 ? (
        <p className="mt-16 text-muted">등록된 제품이 없습니다.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {ranked.map((product) => (
            <ProductCard key={product.id} product={product} showDiscountRate showProductId />
          ))}
        </div>
      )}
    </div>
  );
}
