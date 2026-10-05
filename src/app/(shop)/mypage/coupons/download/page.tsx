import Link from "next/link";
import { redirect } from "next/navigation";
import { CouponDownloadBoard } from "@/components/coupon-download-board";
import { requireUser } from "@/lib/auth";
import { downloadableMemberCoupons } from "@/lib/member-coupons";

export default async function CouponDownloadPage() {
  const session = await requireUser();
  if (!session?.user.id) redirect("/login?callbackUrl=/mypage/coupons/download");
  const coupons = await downloadableMemberCoupons(session.user.id);

  return (
    <div>
      <Link href="/mypage/coupons" className="text-sm text-muted">쿠폰 목록</Link>
      <h1 className="mt-3 text-3xl font-bold">쿠폰 다운로드 받기</h1>
      <div className="mt-8">
        <CouponDownloadBoard coupons={coupons} returnTo="/mypage/coupons/download" />
      </div>
    </div>
  );
}
