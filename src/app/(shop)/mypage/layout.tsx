import Link from "next/link";

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-12 md:grid-cols-[200px_1fr]">
      <nav className="space-y-3 text-sm">
        <Link href="/mypage/orders" className="block">
          주문조회
        </Link>
        <Link href="/mypage/profile" className="block">
          회원정보
        </Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
