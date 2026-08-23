import Link from "next/link";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/members", label: "회원관리" },
  { href: "/admin/display/banners", label: "배너관리" },
  { href: "/admin/display/categories", label: "카테고리 관리" },
  { href: "/admin/products", label: "상품 등록" },
  { href: "/admin/products/display", label: "상품전시관리" },
  { href: "/admin/promotions/coupons", label: "쿠폰관리" },
  { href: "/admin/promotions/exhibitions", label: "기획전 관리" },
  { href: "/admin/orders", label: "주문관리" },
];

export function AdminNav() {
  return (
    <aside className="border-r border-line bg-surface">
      <div className="px-6 py-6">
        <Logo href="/" className="text-xl" />
        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.2em] text-muted">Admin</p>
      </div>
      <nav className="flex flex-col px-3 pb-10 text-sm">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-sm px-3 py-2 hover:bg-paper"
          >
            {item.label}
          </Link>
        ))}
        <Link href="/" className="mt-6 px-3 py-2 text-muted">
          스토어로 돌아가기
        </Link>
      </nav>
    </aside>
  );
}
