import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/products" className="text-muted hover:text-ink">
          상품 등록
        </Link>
      </p>
      <h1 className="display mt-3 text-4xl">상품 수정</h1>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
