import Link from "next/link";
import { couponDiscountForLines, couponEligibleProductIds } from "@/lib/discounts";
import { priceProducts } from "@/lib/exhibition-offers";
import { getCart, getSelectedCoupon } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { CartBoard } from "@/components/cart-board";
import { requireUser } from "@/lib/auth";
import { downloadableMemberCoupons } from "@/lib/member-coupons";
import { selectedOffers, resolvedCouponSelection, couponSelection, couponTargets } from "@/lib/checkout-pricing";

function listedIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function seoulWhen(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("month")}월 ${pick("day")}일 ${pick("hour")}:${pick("minute")}`;
}

function couponBlockReason(coupon: { scope: string; startAt: Date; includedProductIds: string; excludedProductIds: string; minOrderAmount: number; minQuantity: number }, line: { productId: string; amount: number; quantity: number }, now: Date) {
  if (coupon.startAt > now) return `${seoulWhen(coupon.startAt)}부터 사용할 수 있습니다.`;
  const included = listedIds(coupon.includedProductIds);
  const excluded = listedIds(coupon.excludedProductIds);
  if (excluded.includes(line.productId)) return "제외된 상품입니다.";
  if (included.length > 0 && !included.includes(line.productId)) return "지정된 상품이 아닙니다.";
  if (coupon.scope === "ONE_PLUS_ONE" && line.quantity < 2) return "같은 상품 2개부터 사용할 수 있습니다.";
  if (line.amount < coupon.minOrderAmount) return `${formatPrice(coupon.minOrderAmount)} 이상 구매 시 사용할 수 있습니다.`;
  if (coupon.minQuantity > 0 && line.quantity < coupon.minQuantity) return `${coupon.minQuantity}개 이상부터 사용할 수 있습니다.`;
  return "지금은 적용할 수 없습니다.";
}

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
  const downloads = (await downloadableMemberCoupons(session?.user.id)).filter((coupon) => !coupon.owned).map((coupon) => ({
    id: coupon.id,
    name: coupon.name,
    discount: coupon.discount,
    endsLabel: coupon.endsLabel,
  }));
  const couponLines = rows.map((row) => ({ productId: row.product.id, categoryId: row.product.categoryId, amount: row.product.price * row.quantity, quantity: row.quantity, onePlusOne: row.onePlusOne === true }));
  const now = new Date();
  const coupons = await prisma.coupon.findMany({ where: { isActive: true, isPaused: false, endAt: { gte: now } }, include: { issues: true } });
  const visibleCoupons = coupons.filter((coupon) => coupon.startAt <= now && coupon.issues.some((issue) => issue.targetType === "CATEGORY" || (issue.targetType === "USER" && issue.userId === session?.user.id)));
  const code = await getSelectedCoupon();
  const targets = couponTargets(code);
  const options = visibleCoupons.map(coupon => {
    const scope = coupon.scope === "PRODUCT" ? "상품" : coupon.scope === "ONE_PLUS_ONE" ? "1+1 할인" : coupon.scope === "MULTI_CART" ? "가지가지 할인" : "장바구니";
    const productScope = coupon.scope === "PRODUCT" || coupon.scope === "ONE_PLUS_ONE";
    const productDiscounts = productScope ? couponLines.flatMap((line) => {
      const amount = couponDiscountForLines(coupon, [line], now, session?.user.id);
      if (amount == null || amount <= 0) return [];
      const rate = coupon.discountType === "PERCENT" && coupon.scope !== "ONE_PLUS_ONE" ? coupon.discountValue : Math.max(1, Math.round((amount / line.amount) * 100));
      return [{ productId: line.productId, onePlusOne: line.onePlusOne, discount: amount, rate }];
    }) : [];
    return {
      code: coupon.code,
      scope: coupon.scope,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount: couponDiscountForLines(coupon, couponLines, now, session?.user.id, targets[coupon.code]),
      isStackable: coupon.isStackable,
      summary: `[${scope}] ${coupon.name}`,
      productDiscounts,
      productIds: couponEligibleProductIds(coupon, couponLines, now, session?.user.id, targets[coupon.code]),
      label: coupon.scope === "ONE_PLUS_ONE"
        ? `[1+1 할인] ${coupon.name} · 동일 상품 2개당 1개 가격 할인${coupon.maxDiscountAmount > 0 ? ` · 최대 ${formatPrice(coupon.maxDiscountAmount)}` : ""}`
        : `[${scope}] ${coupon.name}${coupon.scope === "MULTI_CART" ? " · 서로 다른 상품 2종 이상" : coupon.minQuantity > 0 ? ` · ${coupon.minQuantity}개 이상` : ""} · ${coupon.discountValue}${coupon.discountType === "PERCENT" ? "%" : "원"} 할인${coupon.maxDiscountAmount > 0 ? ` · 최대 ${formatPrice(coupon.maxDiscountAmount)}` : ""}`,
    };
  }).filter((option): option is typeof option & { discount: number } => option.discount !== null).map((option) => ({ ...option, eligible: true }));
  const selected = selectedOffers(options, code, total);
  const selectedCode = couponSelection(resolvedCouponSelection(selected, code))
    .filter((part) => selected.some((option) => option.code === part.split("@")[0]))
    .map((part) => {
      if (part.includes("@")) return part;
      const option = selected.find((item) => item.code === part);
      const productId = option?.productIds.length === 1 ? option.productIds[0] : "";
      const matched = rows.filter((row) => row.product.id === productId);
      return option && (option.scope === "PRODUCT" || option.scope === "ONE_PLUS_ONE") && matched.length === 1
        ? `${option.code}@${matched[0].productId}:${matched[0].onePlusOne ? "1" : "0"}`
        : part;
    })
    .join(",");
  const couponNotices = session ? rows.flatMap((row) => {
    const line = couponLines.find((item) => item.productId === row.product.id && item.onePlusOne === (row.onePlusOne === true));
    if (!line) return [];
    const key = `${row.productId}:${row.onePlusOne ? "1" : "0"}`;
    return coupons.flatMap((coupon) => {
      if (coupon.scope !== "PRODUCT" && coupon.scope !== "ONE_PLUS_ONE") return [];
      if (!coupon.issues.some((issue) => issue.targetType === "USER" && issue.userId === session.user.id)) return [];
      const fits = options.some((option) => option.code === coupon.code && option.productDiscounts.some((deal) => deal.productId === row.product.id && !!deal.onePlusOne === (row.onePlusOne === true)));
      if (fits) return [];
      const scope = coupon.scope === "ONE_PLUS_ONE" ? "1+1 할인" : "상품";
      return [{ key, summary: `[${scope}] ${coupon.name}`, reason: couponBlockReason(coupon, line, now) }];
    });
  }) : [];
  return (
    <div>
      <h1 className="display text-5xl">장바구니</h1>
      {rows.length === 0 ? (
        <div className="flex min-h-[52vh] flex-col items-center justify-center gap-5 text-center">
          <p>장바구니에 담긴 상품이 없습니다</p>
          <Link href="/" className="btn">쇼핑하기</Link>
        </div>
      ) : (
        <CartBoard
          rows={rows.map((row) => ({
            productId: row.productId,
            quantity: row.quantity,
            onePlusOne: row.onePlusOne,
            product: { id: row.product.id, name: row.product.name, price: row.product.price, imageUrl: row.product.imageUrl, categoryId: row.product.categoryId },
          }))}
          couponOptions={options}
          couponNotices={couponNotices}
          downloads={downloads}
          signedIn={!!session}
          selectedCoupon={selectedCode}
          subtotal={total}
          userId={session?.user.id}
          coupons={selected.flatMap((option) => {
            const coupon = visibleCoupons.find((item) => item.code === option.code);
            if (!coupon) return [];
            return [{
              code: coupon.code,
              summary: option.summary,
              isStackable: coupon.isStackable,
              scope: coupon.scope,
              isActive: coupon.isActive,
              isPaused: coupon.isPaused,
              startAt: coupon.startAt.toISOString(),
              endAt: coupon.endAt.toISOString(),
              maxUses: coupon.maxUses,
              usedCount: coupon.usedCount,
              minOrderAmount: coupon.minOrderAmount,
              minQuantity: coupon.minQuantity,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              maxDiscountAmount: coupon.maxDiscountAmount,
              includedProductIds: coupon.includedProductIds,
              excludedProductIds: coupon.excludedProductIds,
              issues: coupon.issues.map((issue) => ({ targetType: issue.targetType, userId: issue.userId, categoryId: issue.categoryId })),
            }];
          })}
        />
      )}
    </div>
  );
}
