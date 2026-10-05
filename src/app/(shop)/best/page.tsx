import { prisma } from "@/lib/prisma";
import { presentProducts } from "@/lib/store-price";
import { ProductCard } from "@/components/product-card";
import { loadPageDisplay } from "@/lib/display";

export default async function BestPage() {
  const [catalog, display] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
    }),
    loadPageDisplay("best"),
  ]);

  const products = await presentProducts(catalog);
  const productById = new Map(products.map((product) => [product.id, product]));
  const ranked = display
    .filter((item) => item.kind === "product" && item.isVisible)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .flatMap((item) => {
      const product = productById.get(item.refId);
      return product ? [{ product, rank: item.sortOrder }] : [];
    });

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Best</p>
      <h1 className="display mt-3 text-5xl">Best</h1>
      <p className="mt-3 text-muted">전시에 등록한 제품 {ranked.length}개</p>
      {ranked.length === 0 ? (
        <p className="mt-16 text-muted">등록된 제품이 없습니다.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {ranked.map(({ product, rank }) => (
            <ProductCard key={product.id} product={product} rank={rank} showDiscountRate showProductId />
          ))}
        </div>
      )}
    </div>
  );
}
