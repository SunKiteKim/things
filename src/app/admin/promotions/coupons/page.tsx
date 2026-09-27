import { prisma } from "@/lib/prisma";
import { CouponAdmin } from "@/components/coupon-admin";
import { maskEmail, maskPersonalInfo } from "@/lib/utils";

export default async function CouponsAdminPage() {
  const [coupons, products, members, categories] = await Promise.all([
    prisma.coupon.findMany({ include: { issues: true }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { role: "MEMBER" }, select: { id: true, name: true, email: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <CouponAdmin
      coupons={coupons.map((coupon) => ({
        ...coupon,
        issues: coupon.issues.map((issue) => ({ ...issue, createdAt: issue.createdAt.toISOString() })),
        minQuantity: coupon.scope === "CART" ? 0 : ["MULTI_CART", "ONE_PLUS_ONE"].includes(coupon.scope) ? Math.max(2, coupon.minQuantity) : coupon.minQuantity,
        startAt: coupon.startAt.toISOString(),
        endAt: coupon.endAt.toISOString(),
        createdAt: coupon.createdAt.toISOString(),
      }))}
      products={products}
      issueTargets={{
        users: members.map((member) => ({ id: member.id, label: `${maskPersonalInfo(member.name)} · ${maskEmail(member.email)}` })),
        categories: categories.map((category) => ({ id: category.id, label: category.name })),
      }}
    />
  );
}
