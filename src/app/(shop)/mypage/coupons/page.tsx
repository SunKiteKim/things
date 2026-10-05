import Link from "next/link";
import { redirect } from "next/navigation";
import { CouponDownloadBoard } from "@/components/coupon-download-board";
import { CouponDownloadDialog } from "@/components/coupon-download-dialog";
import { CouponTicket, EmptyCouponMark } from "@/components/coupon-ticket";
import { requireUser } from "@/lib/auth";
import { couponToneLabel, downloadableMemberCoupons, memberCoupons, type MemberCouponView } from "@/lib/member-coupons";

function CouponTable({ rows }: { rows: MemberCouponView[] }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[760px] border-t border-line text-sm">
        <thead>
          <tr className="border-b border-line text-center text-muted">
            <th className="w-14 px-3 py-3 font-normal">번호</th>
            <th className="px-3 py-3 text-left font-normal">쿠폰명</th>
            <th className="px-3 py-3 font-normal">할인금액</th>
            <th className="px-3 py-3 font-normal">적용기준</th>
            <th className="px-3 py-3 font-normal">제한조건</th>
            <th className="px-3 py-3 font-normal">유효기간</th>
            <th className="px-3 py-3 font-normal">구분</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((coupon, index) => (
            <tr key={coupon.id} className="border-b border-line text-center">
              <td className="px-3 py-5 text-muted">{index + 1}</td>
              <td className="px-3 py-5">
                <div className="flex items-center gap-4 text-left">
                  <CouponTicket tone={coupon.tone} />
                  <span>{coupon.name}</span>
                </div>
              </td>
              <td className="px-3 py-5">{coupon.discount}</td>
              <td className="px-3 py-5">{coupon.basis}</td>
              <td className="px-3 py-5">{coupon.limit}</td>
              <td className="px-3 py-5">{coupon.period}</td>
              <td className="px-3 py-5">{couponToneLabel(coupon.tone)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MyCouponsPage({ searchParams }: { searchParams: Promise<{ history?: string }> }) {
  const session = await requireUser();
  if (!session?.user.id) redirect("/login?callbackUrl=/mypage/coupons");
  const history = (await searchParams).history === "1";
  const [{ active, expired }, downloadable] = await Promise.all([
    memberCoupons(session.user.id),
    downloadableMemberCoupons(session.user.id),
  ]);
  const rows = history ? expired : active;

  return (
    <div>
      <h1 className="text-3xl font-bold">쿠폰</h1>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <p className="text-sm">
          <span>할인쿠폰 </span>
          <span className="font-bold text-[#1f8a4c]">{active.length}장</span>
          <span className="mx-3 text-line">|</span>
          <Link href={history ? "/mypage/coupons" : "/mypage/coupons?history=1"} className="text-muted">
            {history ? "보유 쿠폰" : "지난 쿠폰내역"}
          </Link>
        </p>
        <CouponDownloadDialog>
          <CouponDownloadBoard coupons={downloadable} returnTo="/mypage/coupons" />
        </CouponDownloadDialog>
      </div>
      {rows.length === 0 ? (
        history ? (
          <p className="py-16 text-center text-sm text-muted">지난 쿠폰이 없습니다.</p>
        ) : (
          <Link href="/mypage/coupons/download" className="mt-10 block bg-[#f3f3f3] px-6 py-14 text-center transition hover:bg-[#ececec]">
            <EmptyCouponMark />
            <p className="mt-5 text-sm text-[#8a8a8a]">보유한 쿠폰이 없습니다. 쿠폰을 다운받아주세요.</p>
          </Link>
        )
      ) : (
        <CouponTable rows={rows} />
      )}
    </div>
  );
}
