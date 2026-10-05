import { CouponCatalog } from "@/components/coupon-catalog";
import { requireUser } from "@/lib/auth";
import { downloadableMemberCoupons } from "@/lib/member-coupons";

export default async function CouponsPage() {
  const session = await requireUser();
  const coupons = await downloadableMemberCoupons(session?.user.id);

  return (
    <div>
      <h1 className="text-3xl font-bold">쿠폰</h1>
      <div className="mt-8">
        <CouponCatalog coupons={coupons} />
      </div>
    </div>
  );
}
