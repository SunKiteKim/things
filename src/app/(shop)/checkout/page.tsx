import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCart, getSelectedCoupon } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CheckoutClient } from "@/components/checkout-client";
import { couponDiscountForLines } from "@/lib/discounts";
import { priceProducts } from "@/lib/exhibition-offers";

export default async function CheckoutPage() {
  const session = await requireUser();
  if (!session) redirect("/login?callbackUrl=/checkout");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const cart = await getCart();
  const found = await prisma.product.findMany({
    where: { id: { in: cart.map((line) => line.productId) } },
  });
  const products = await priceProducts(found);
  const rows = cart
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return null;
      return { ...line, product };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
  const subtotal = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  if (!rows.length) redirect("/cart");

  const code = await getSelectedCoupon();
  const couponLines = rows.map((row) => ({ productId: row.product.id, categoryId: row.product.categoryId, amount: row.product.price * row.quantity, quantity: row.quantity }));
  const coupons = await prisma.coupon.findMany({ where: { isActive: true, isPaused: false, startAt: { lte: new Date() }, endAt: { gte: new Date() } }, include: { issues: true } });
  const options = coupons
    .filter((coupon) => coupon.issues.length === 0 || coupon.issues.some((issue) => issue.targetType === "CATEGORY" || issue.userId === session.user.id))
    .map((coupon) => ({
      code: coupon.code,
      discount: couponDiscountForLines(coupon, couponLines, new Date(), session.user.id),
      isStackable: coupon.isStackable,
      label: `[${coupon.scope === "PRODUCT" ? "상품" : coupon.scope === "ONE_PLUS_ONE" ? "1+1 할인" : coupon.scope === "MULTI_CART" ? "가지가지 할인" : "장바구니"}] ${coupon.name}`,
    }))
    .filter((option): option is typeof option & { discount: number } => option.discount !== null)
    .map((option) => ({ ...option, eligible: true }));
  const selectedOption = options.find((option) => option.code === code) ?? options.reduce<(typeof options)[number] | undefined>((best, option) => !best || option.discount > best.discount ? option : best, undefined);
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
          initialCoupon={selectedOption ? { code: selectedOption.code, discount: selectedOption.discount } : undefined}
          couponOptions={options}
          subtotal={subtotal}
          orderName={rows[0].product.name + (rows.length > 1 ? ` 외 ${rows.length - 1}건` : "")}
          tossClientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ""}
        />
        <aside className="h-fit border border-line bg-surface p-6">
          <p className="text-sm text-muted">주문 상품</p>
          <ul className="mt-4 space-y-3 text-sm">
            {rows.map((row) => (
              <li key={row.productId + String(!!row.onePlusOne)} className="flex justify-between gap-4">
                <span>
                  <span className="product-name">{row.product.name}</span> × {row.quantity}{row.onePlusOne ? ` (1+1 증정 ${row.quantity}개)` : ""}
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
