import Link from "next/link";
import { CartCoupon } from "@/components/cart-coupon";
import { couponDiscountForLines } from "@/lib/discounts";
import { priceProducts } from "@/lib/exhibition-offers";
import { getCart, getSelectedCoupon } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CartList } from "@/components/cart-list";
import { requireUser } from "@/lib/auth";
import { selectedOffers, combinedDiscount, shippingFee } from "@/lib/checkout-pricing";

export default async function CartPage() {
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
  const total = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);

  const session = await requireUser();
  const couponLines = rows.map((row) => ({ productId: row.product.id, categoryId: row.product.categoryId, amount: row.product.price * row.quantity, quantity: row.quantity }));
  const coupons = await prisma.coupon.findMany({ where: { isActive: true, isPaused: false, startAt: { lte: new Date() }, endAt: { gte: new Date() } }, include: { issues: true } });
  const visibleCoupons = coupons.filter((coupon) => coupon.issues.length === 0 || coupon.issues.some((issue) => issue.targetType === "CATEGORY" || issue.userId === session?.user.id));
  const code = await getSelectedCoupon();
  const options = visibleCoupons.map(coupon => ({
    code: coupon.code,
    discount: couponDiscountForLines(coupon, couponLines, new Date(), session?.user.id),
    isStackable: coupon.isStackable,
    label: coupon.scope === "ONE_PLUS_ONE"
      ? `[1+1 할인] ${coupon.name} · 동일 상품 2개당 1개 가격 할인${coupon.maxDiscountAmount > 0 ? ` · 최대 ${formatPrice(coupon.maxDiscountAmount)}` : ""}`
      : `[${coupon.scope === "PRODUCT" ? "상품" : coupon.scope === "MULTI_CART" ? "가지가지 할인" : "장바구니"}] ${coupon.name}${coupon.scope === "MULTI_CART" ? " · 서로 다른 상품 2종 이상" : coupon.minQuantity > 0 ? ` · ${coupon.minQuantity}개 이상` : ""} · ${coupon.discountValue}${coupon.discountType === "PERCENT" ? "%" : "원"} 할인${coupon.maxDiscountAmount > 0 ? ` · 최대 ${formatPrice(coupon.maxDiscountAmount)}` : ""}`,
  })).filter((option): option is typeof option & { discount: number } => option.discount !== null).map((option) => ({ ...option, eligible: true }));
  const selected = selectedOffers(options, code, total);
  const selectedCode = selected.map(option => option.code).join(",");
  const discount = combinedDiscount(selected, total);
  const shipping = shippingFee(total - discount);
  return (
    <div>
      <h1 className="display text-5xl">장바구니</h1>
      {rows.length === 0 ? (
        <div className="flex min-h-[52vh] flex-col items-center justify-center gap-5 text-center">
          <p>장바구니에 담긴 상품이 없습니다</p>
          <Link href="/" className="btn">쇼핑하기</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_0.6fr]">
          <CartList rows={rows.map((row) => ({ productId: row.productId, quantity: row.quantity, onePlusOne: row.onePlusOne, product: { id: row.product.id, name: row.product.name, price: row.product.price, imageUrl: row.product.imageUrl } }))} />
          <aside className="h-fit border border-line bg-surface p-6">
            <p className="text-sm text-muted">합계</p>
            <p className="mt-2 text-2xl">{formatPrice(total - discount)}</p>
            <p className="mt-2 text-sm">쿠폰 할인 {formatPrice(discount)}</p>
            <p className="mt-2 text-sm">배송비 {formatPrice(shipping)}</p>
            <p className="mt-2 text-xs text-muted">쿠폰 할인 후 상품금액 50,000원 이상 무료배송 · 기본 3,000원</p>
            <p className="mt-4 text-lg font-semibold">예상 결제금액 {formatPrice(total - discount + shipping)}</p>
            <CartCoupon options={options} selected={selectedCode} subtotal={total} />
            <Link href="/checkout" className="btn mt-6 w-full">
              주문서 작성
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
