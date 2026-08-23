import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CheckoutClient } from "@/components/checkout-client";

export default async function CheckoutPage() {
  const session = await requireUser();
  if (!session) redirect("/login?callbackUrl=/checkout");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
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
  const subtotal = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  if (!rows.length) redirect("/cart");

  return (
    <div>
      <h1 className="display text-5xl">주문서</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <CheckoutClient
          user={{
            id: user?.id ?? session.user.id,
            name: user?.name ?? "",
            phone: user?.phone ?? "",
            zipCode: user?.zipCode ?? "",
            address: user?.address ?? "",
            addressDetail: user?.addressDetail ?? "",
            email: user?.email ?? "",
          }}
          subtotal={subtotal}
          orderName={rows[0].product.name + (rows.length > 1 ? ` 외 ${rows.length - 1}건` : "")}
          tossClientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ""}
        />
        <aside className="h-fit border border-line bg-surface p-6">
          <p className="text-sm text-muted">주문 상품</p>
          <ul className="mt-4 space-y-3 text-sm">
            {rows.map((row) => (
              <li key={row.productId} className="flex justify-between gap-4">
                <span>
                  <span className="product-name">{row.product.name}</span> × {row.quantity}
                </span>
                <span>{formatPrice(row.product.price * row.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex justify-between text-base">
            <span>상품 합계</span>
            <span>{formatPrice(subtotal)}</span>
          </p>
        </aside>
      </div>
    </div>
  );
}
