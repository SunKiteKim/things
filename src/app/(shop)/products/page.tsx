import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { CategoryPills } from "@/components/category-pills";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category: categorySlug, page: pageParam } = await searchParams;
  const requestedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });
  const activeCategory = categorySlug
    ? categories.find((item) => item.slug === categorySlug) ?? null
    : null;

  const where = {
    isPublished: true,
    ...(activeCategory ? { categoryId: activeCategory.id } : {}),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: { registeredAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const title = activeCategory?.name ?? "All Products";

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Products</p>
      <h1 className="display mt-3 text-5xl">{title}</h1>
      <p className="mt-3 text-muted">
        {activeCategory ? activeCategory.description || `${activeCategory.name} 제품` : "등록된 전체 제품"}
        {" · "}
        {total}개
      </p>
      <CategoryPills categories={categories} activeSlug={activeCategory?.slug} />
      {products.length === 0 ? (
        <p className="mt-16 text-muted">등록된 제품이 없습니다.</p>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      <Pagination
        page={currentPage}
        totalPages={total > PAGE_SIZE ? totalPages : 1}
        hrefFor={(nextPage) => {
          const params = new URLSearchParams();
          if (activeCategory) params.set("category", activeCategory.slug);
          if (nextPage > 1) params.set("page", String(nextPage));
          const query = params.toString();
          return query ? `/products?${query}` : "/products";
        }}
      />
    </div>
  );
}
