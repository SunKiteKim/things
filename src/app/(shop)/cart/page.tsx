import Image from "next/image";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CartControls } from "@/components/cart-controls";

export default async function CartPage() {
  const cart = await getCart();
  const products = await prisma.product.findMany({
    where: { id: { in: cart.map((line) => line.productId) } },
  });
  const rows = cart
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return null;
      return { ...line, product };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
  const total = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);

  return (
    <div>
      <h1 className="display text-5xl">장바구니</h1>
      {rows.length === 0 ? (
        <p className="mt-10 text-muted">
          아직 담긴 사물이 없습니다. <Link href="/category/object">쇼핑하기</Link>
        </p>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            {rows.map((row) => (
              <div key={row.productId} className="grid grid-cols-[96px_1fr] gap-4 border-b border-line pb-6">
                <div className="relative aspect-square overflow-hidden bg-surface">
                  <Image src={row.product.imageUrl} alt={row.product.name} fill className="object-cover" />
                </div>
                <div>
                  <Link href={`/product/${row.product.slug}`} className="product-name">
                    {row.product.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{formatPrice(row.product.price)}</p>
                  <CartControls productId={row.productId} quantity={row.quantity} />
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit border border-line bg-surface p-6">
            <p className="text-sm text-muted">합계</p>
            <p className="mt-2 text-2xl">{formatPrice(total)}</p>
            <Link href="/checkout" className="btn mt-6 w-full">
              주문서 작성
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
