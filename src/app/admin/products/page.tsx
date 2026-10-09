import { prisma } from "@/lib/prisma";
import { deleteProduct } from "@/actions/products";
import { formatDate, formatPrice } from "@/lib/utils";
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
        columns={["이미지", { label: "상품번호", sortKey: "id" }, "상품명", "카테고리", { label: "판매가", sortKey: "price" }, { label: "회원 할인율", sortKey: "discount" }, { label: "회원할인가", sortKey: "memberPrice" }, { label: "등록일", sortKey: "date" }]}
        search={{ placeholder: "상품명 또는 상품번호", fields: [{ value: "name", label: "상품명" }, { value: "id", label: "상품번호" }] }}
        filters={[{ key: "category", label: "카테고리", options: categories.map((category) => ({ value: category.id, label: category.name })) }]}
        rows={products.map((product) => ({
          id: product.id,
          searchText: `${product.name} ${product.id}`,
          searchFields: { name: product.name, id: product.id },
          facets: { category: product.categoryId },
          sortValues: {
            id: product.id,
            price: product.originalPrice ?? product.price,
            discount: product.discountRate,
            memberPrice: product.price,
            date: product.registeredAt.getTime(),
          },
          cells: [
            <ProductImage key={product.id} src={product.imageUrl} alt="" className="h-12 w-12 object-cover" />,
            product.id,
            product.name,
            product.category.name,
            formatPrice(product.originalPrice ?? product.price),
            `${product.discountRate}%`,
            formatPrice(product.price),
            formatDate(product.registeredAt),
          ],
          detail: <div key={product.id}><ProductForm product={product} categories={categories} />{boards.get(product.id) ? <ProductDiscountBoard board={boards.get(product.id)!} /> : null}<form action={deleteProduct} className="mt-4 max-w-3xl border-t border-line pt-4"><input type="hidden" name="id" value={product.id} /><button className="btn btn-ghost">상품 삭제</button></form></div>,
        }))}
      />
    </div>
  );
}
