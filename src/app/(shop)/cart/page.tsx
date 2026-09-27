import Image from "next/image";
import Link from "next/link";
import { CartCoupon } from "@/components/cart-coupon";
import { couponDiscountForLines } from "@/lib/discounts";
import { getCart, getSelectedCoupon } from "@/lib/cart";
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

  const couponLines = rows.map((row) => ({ productId: row.product.id, amount: row.product.price * row.quantity, quantity: row.quantity }));
  const coupons = await prisma.coupon.findMany({ where: { isActive: true, startAt: { lte: new Date() }, endAt: { gte: new Date() } } });
  const code = await getSelectedCoupon();
  const selectedCoupon = coupons.find(coupon => coupon.code === code);
  const discount = selectedCoupon ? couponDiscountForLines(selectedCoupon, couponLines) : null;
  const options = coupons.map(coupon => ({ code: coupon.code, eligible: couponDiscountForLines(coupon, couponLines) !== null, label: `[${coupon.scope === "PRODUCT" ? "상품" : "장바구니"}] ` + coupon.name + (coupon.minQuantity > 0 ? ' · ' + coupon.minQuantity + '개 이상' : '') + ' · ' + coupon.discountValue + (coupon.discountType === "PERCENT" ? "%" : "원") + ' 할인' }));
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
              <div key={row.productId + String(!!row.onePlusOne)} className="grid grid-cols-[96px_1fr] gap-4 border-b border-line pb-6">
                <div className="relative aspect-square overflow-hidden bg-surface">
                  <Image src={row.product.imageUrl} alt={row.product.name} fill className="object-cover" />
                </div>
                <div>
                  <Link href={`/product/${row.product.id}`} className="product-name">
                    {row.product.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{formatPrice(row.product.price)}</p>
                  {row.onePlusOne && <p className="text-sm">1+1 · 구매 {row.quantity}개 + 증정 {row.quantity}개</p>}
                  <CartControls productId={row.productId} quantity={row.quantity} onePlusOne={row.onePlusOne} />
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit border border-line bg-surface p-6">
            <p className="text-sm text-muted">합계</p>
            <p className="mt-2 text-2xl">{formatPrice(total - (discount ?? 0))}</p>
            <p className="mt-2 text-sm">쿠폰 할인 {formatPrice(discount ?? 0)}</p>
            <CartCoupon options={options} selected={discount !== null ? code : ""} />
            {code && discount === null && <p className="text-sm text-accent">기존 쿠폰의 조건이 충족되지 않아 적용되지 않습니다.</p>}
            <Link href="/checkout" className="btn mt-6 w-full">
              주문서 작성
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
