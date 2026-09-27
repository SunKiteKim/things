import { prisma } from "@/lib/prisma";
import { CouponAdmin } from "@/components/coupon-admin";

export default async function CouponsAdminPage() {
  const [coupons, products] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <CouponAdmin
      coupons={coupons.map((coupon) => ({
        ...coupon,
        minQuantity: coupon.scope === "CART" ? Math.max(2, coupon.minQuantity) : coupon.minQuantity,
        startAt: coupon.startAt.toISOString(),
        endAt: coupon.endAt.toISOString(),
        createdAt: coupon.createdAt.toISOString(),
      }))}
      products={products}
    />
  );
}
