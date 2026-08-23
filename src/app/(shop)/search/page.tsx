import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const keyword = q.trim();
  const products = keyword
    ? await prisma.product.findMany({
        where: {
          isPublished: true,
          OR: [
            { name: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Search</p>
      <h1 className="display mt-3 text-5xl">검색 결과</h1>
      <form className="mt-8 max-w-md">
        <input className="field" name="q" defaultValue={keyword} placeholder="사물, 조명, 린넨…" />
      </form>
      <p className="mt-6 text-sm text-muted">
        {keyword ? `"${keyword}" · ${products.length}개` : "검색어를 입력하세요."}
      </p>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
