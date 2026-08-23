import { prisma } from "@/lib/prisma";
import { updateProductDisplay } from "@/actions/products";

export default async function ProductDisplayPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <h1 className="display text-4xl">상품전시관리</h1>
      <p className="mt-2 text-sm text-muted">공개 여부, 메인 노출, 정렬만 빠르게 바꿉니다.</p>
      <div className="mt-8 space-y-4">
        {products.map((product) => (
          <form
            key={product.id}
            action={updateProductDisplay}
            className="grid items-center gap-3 border border-line p-4 md:grid-cols-[1.4fr_repeat(3,0.6fr)_auto]"
          >
            <input type="hidden" name="id" value={product.id} />
            <div>
              <p className="product-name">{product.name}</p>
              <p className="text-xs text-muted">{product.category.name}</p>
            </div>
            <label className="text-sm">
              <input type="checkbox" name="isPublished" defaultChecked={product.isPublished} /> 공개
            </label>
            <label className="text-sm">
              <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} /> 메인
            </label>
            <input className="field" name="sortOrder" type="number" defaultValue={product.sortOrder} />
            <button className="btn btn-ghost">저장</button>
          </form>
        ))}
      </div>
    </div>
  );
}
