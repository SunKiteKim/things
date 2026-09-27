import { prisma } from "@/lib/prisma";
import { CouponAdmin } from "@/components/coupon-admin";

export default async function CouponsAdminPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <CouponAdmin
      coupons={coupons.map((coupon) => ({
        ...coupon,
        startAt: coupon.startAt.toISOString(),
        endAt: coupon.endAt.toISOString(),
        createdAt: coupon.createdAt.toISOString(),
      }))}
    />
  );
}
