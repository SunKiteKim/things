import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteProduct } from "@/actions/products";
import { LIMITS, discountedPrice, formatDate, formatPrice } from "@/lib/utils";

export default async function ProductsAdminPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { id: "asc" },
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="display text-4xl">상품 등록</h1>
          <p className="mt-2 text-sm text-muted">
            {products.length} / {LIMITS.MAX_PRODUCTS}개
          </p>
        </div>
        <Link href="/admin/products/new" className="btn">
          새 상품
        </Link>
      </div>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="py-3">상품번호</th>
            <th>상품명</th>
            <th>카테고리</th>
            <th>판매가</th>
            <th>할인율</th>
            <th>할인가</th>
            <th>등록일</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-line">
              <td className="py-4">{product.id}</td>
              <td className="product-name py-4">{product.name}</td>
              <td>{product.category.name}</td>
              <td>{formatPrice(product.originalPrice ?? product.price)}</td>
              <td>{product.discountRate}%</td>
              <td>{formatPrice(discountedPrice(product.originalPrice ?? product.price, product.discountRate))}</td>
              <td>{formatDate(product.registeredAt)}</td>
              <td className="py-4">
                <div className="flex gap-2">
                  <Link href={`/admin/products/${product.id}`} className="btn btn-ghost min-h-8">
                    수정
                  </Link>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={product.id} />
                    <button className="btn btn-ghost min-h-8">삭제</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
