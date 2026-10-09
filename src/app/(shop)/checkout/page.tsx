import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBuyNow, getCheckoutLines, getSelectedCoupon } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { CheckoutClient } from "@/components/checkout-client";
import { couponDiscountForLines } from "@/lib/discounts";
import { priceProducts } from "@/lib/exhibition-offers";
import { selectedOffers, combinedDiscount, resolvedCouponSelection, couponTargets, couponSelection } from "@/lib/checkout-pricing";

export default async function CheckoutPage() {
  const session = await requireUser();
  if (!session) redirect("/login?callbackUrl=/checkout");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const cart = await getCheckoutLines();
  const found = await prisma.product.findMany({
    where: { id: { in: cart.map((line) => line.productId) } },
  });
  const products = await priceProducts(found, new Date(), session.user.id);
  const rows = cart
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return null;
      return { ...line, product };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);
  const subtotal = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  if (!rows.length) {
    redirect("/cart");
  }

  const buyNow = await getBuyNow();
  const code = await getSelectedCoupon();
  const targets = couponTargets(code);
  const couponLines = rows.map((row) => ({ productId: row.product.id, categoryId: row.product.categoryId, amount: row.product.price * row.quantity, quantity: row.quantity, onePlusOne: row.onePlusOne === true }));
  const coupons = await prisma.coupon.findMany({ where: { isActive: true, isPaused: false, startAt: { lte: new Date() }, endAt: { gte: new Date() } }, include: { issues: true } });
  const options = coupons
    .filter((coupon) => coupon.issues.some((issue) => issue.targetType === "CATEGORY" || (issue.targetType === "USER" && issue.userId === session.user.id)))
    .map((coupon) => ({
      code: coupon.code,
      scope: coupon.scope,
      selection: targets[coupon.code] ? `${coupon.code}@${targets[coupon.code]}` : coupon.code,
      discount: couponDiscountForLines(coupon, couponLines, new Date(), session.user.id, targets[coupon.code]),
      isStackable: coupon.isStackable,
      label: `[${coupon.scope === "PRODUCT" ? "상품" : coupon.scope === "ONE_PLUS_ONE" ? "1+1 할인" : coupon.scope === "MULTI_CART" ? "가지가지 할인" : "장바구니"}] ${coupon.name}`,
    }))
    .filter((option): option is typeof option & { discount: number } => option.discount !== null)
    .map((option) => ({ ...option, eligible: true }));
  const checkoutOptions = buyNow ? options.filter((option) => option.scope !== "CART" && option.scope !== "MULTI_CART") : options;
  const checkoutCode = buyNow
    ? couponSelection(code).filter((part) => checkoutOptions.some((option) => option.code.toUpperCase() === part.split("@")[0].toUpperCase())).join(",") || "-"
    : code;
  const selected = selectedOffers(checkoutOptions, checkoutCode, subtotal);
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
          initialCoupon={{ code: resolvedCouponSelection(selected, checkoutCode), discount: combinedDiscount(selected, subtotal) }}
          couponOptions={checkoutOptions}
          subtotal={subtotal}
          orderName={rows[0].product.name + (rows.length > 1 ? ` 외 ${rows.length - 1}건` : "")}
          tossClientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? ""}
          items={rows.map((row) => ({
            id: row.productId + String(!!row.onePlusOne),
            productId: row.productId,
            imageUrl: row.product.imageUrl,
            name: row.product.name,
            quantity: row.quantity,
            onePlusOne: row.onePlusOne === true,
            amount: row.product.price * row.quantity,
          }))}
        />
      </div>
    </div>
  );
}
