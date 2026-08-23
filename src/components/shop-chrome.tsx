import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";

export async function ShopHeader() {
  const [session, cart] = await Promise.all([auth(), getCart()]);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const shopUser =
    session?.user && session.user.portal !== "admin" && session.user.role !== "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto grid h-[72px] w-full max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-6 px-5 md:px-8">
        <Logo className="text-[1.7rem]" />
        <nav className="hidden items-center justify-center gap-16 text-[0.92rem] font-bold md:flex">
          <Link href="/products" className="whitespace-nowrap hover:opacity-60">
            All Products
          </Link>
          <Link href="/best" className="whitespace-nowrap hover:opacity-60">
            Best
          </Link>
          <Link href="/events" className="whitespace-nowrap hover:opacity-60">
            Events
          </Link>
        </nav>
        <div className="flex items-center gap-5">
          <form action="/search" className="hidden w-40 shrink-0 sm:block">
            <input
              name="q"
              placeholder="검색"
              className="w-full border-0 border-b border-line bg-transparent py-1 outline-none placeholder:text-muted"
            />
          </form>
          <div className="utility-links -mt-1 flex items-center text-[0.78rem] font-normal">
            {shopUser ? (
              <>
                <LogoutButton />
                <span className="px-2 text-muted">|</span>
                <Link href="/mypage">마이페이지</Link>
                <span className="px-2 text-muted">|</span>
              </>
            ) : (
              <>
                <Link href="/login">로그인</Link>
                <span className="px-2 text-muted">|</span>
              </>
            )}
            <Link href="/cart" className="relative">
              장바구니
              {count > 0 && <span className="ml-1 text-accent">{count}</span>}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ShopFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:px-8">
        <div>
          <Logo className="text-[1.7rem]" />
          <p className="mt-5 text-[0.92rem] font-normal leading-7 text-muted">
            고객지원 1588-0101
            <br />
            평일 10:00 – 18:00 (주말·공휴일 휴무)
          </p>
        </div>
        <div className="text-sm font-normal leading-7">
          <p className="mb-3 text-[0.78rem] font-normal">쇼핑</p>
          <Link href="/products" className="block text-muted hover:text-ink">
            All Products
          </Link>
          <Link href="/best" className="block text-muted hover:text-ink">
            Best
          </Link>
          <Link href="/events" className="block text-muted hover:text-ink">
            Events
          </Link>
          <Link href="/search" className="block text-muted hover:text-ink">
            검색
          </Link>
        </div>
        <div className="text-sm font-normal leading-7">
          <p className="mb-3 text-[0.78rem] font-normal">고객지원</p>
          <Link href="/mypage/orders" className="block text-muted hover:text-ink">
            주문조회
          </Link>
          <Link href="/mypage" className="block text-muted hover:text-ink">
            마이페이지
          </Link>
          <Link href="/cart" className="block text-muted hover:text-ink">
            장바구니
          </Link>
          <Link href="/signup" className="block text-muted hover:text-ink">
            회원가입
          </Link>
        </div>
        <div className="text-sm font-normal leading-7 text-muted">
          <p className="mb-3 text-[0.78rem] font-normal text-ink">회사정보</p>
          <p>things</p>
          <p>서울 강남구 도산대로 123</p>
          <p>hello@things.store</p>
          <p>사업자등록번호 000-00-00000</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-5 py-5 text-[0.75rem] font-normal text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>© things. 이 사이트는 개인 포트폴리오용 데모 사이트입니다.</p>
          <p>SELECT. STAY. BE WITH THINGS.</p>
        </div>
      </div>
    </footer>
  );
}
