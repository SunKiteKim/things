import { prisma } from "@/lib/prisma";
import { deleteProduct } from "@/actions/products";
import { discountedPrice, formatDate, formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { ProductDiscountBoard } from "@/components/product-discount-board";
import { discountBoards } from "@/lib/product-discounts";
import { AdminCreateModal } from "@/components/admin-create-modal";
import { ProductForm } from "@/components/product-form";
import { AdminMasterDetail } from "@/components/admin-master-detail";

export default async function ProductsAdminPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const boards = await discountBoards(products);

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="display text-3xl">상품 관리</h1>
        <AdminCreateModal title="상품 등록" triggerLabel="상품 등록" wide><ProductForm categories={categories} /></AdminCreateModal>
      </div>
      <AdminMasterDetail
        listTitle="상품 목록"
        detailTitle="상품 상세"
        columns={["이미지", "상품번호", "상품명", "카테고리", "판매가", "회원 할인", "등록일"]}
        rows={products.map((product) => ({
          id: product.id,
          cells: [
            <ProductImage key={product.id} src={product.imageUrl} alt="" className="h-12 w-12 object-cover" />,
            product.id,
            product.name,
            product.category.name,
            formatPrice(discountedPrice(product.originalPrice ?? product.price, product.discountRate)),
            `${product.discountRate}%`,
            formatDate(product.registeredAt),
          ],
          detail: <div><ProductForm product={product} categories={categories} />{boards.get(product.id) ? <ProductDiscountBoard board={boards.get(product.id)!} /> : null}<form action={deleteProduct} className="mt-4 max-w-3xl border-t border-line pt-4"><input type="hidden" name="id" value={product.id} /><button className="btn btn-ghost">상품 삭제</button></form></div>,
        }))}
      />
    </div>
  );
}
