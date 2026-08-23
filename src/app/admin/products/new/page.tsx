import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/products" className="text-muted hover:text-ink">
          상품 등록
        </Link>
      </p>
      <h1 className="display mt-3 text-4xl">상품 등록</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
