import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { SearchOverlay } from "@/components/search-overlay";

export async function ShopHeader() {
  const [session, cart] = await Promise.all([auth(), getCart()]);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const shopUser =
    session?.user && session.user.portal !== "admin" && session.user.role !== "ADMIN";
  const member = shopUser
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      })
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-5 md:grid md:h-[72px] md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-8">
        <Logo className="shrink-0 text-[1.35rem] sm:text-[1.55rem] md:text-[1.7rem]" />
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-5">
          <div className="flex items-center justify-end gap-2 sm:gap-4">
            {member ? (
              <Link href="/mypage" className="hidden whitespace-nowrap text-sm font-normal hover:opacity-60 sm:block">
                {member.name} 님
              </Link>
            ) : null}
            <SearchOverlay />
          </div>
          <div className="utility-links flex items-center whitespace-nowrap text-[0.7rem] font-normal leading-none sm:text-[0.78rem]">
            {shopUser ? (
              <>
                <LogoutButton />
                <span className="px-1 text-muted sm:px-2">|</span>
                <Link href="/mypage">마이페이지</Link>
                <span className="px-1 text-muted sm:px-2">|</span>
              </>
            ) : (
              <>
                <Link href="/login">로그인</Link>
                <span className="px-1 text-muted sm:px-2">|</span>
              </>
            )}
            <Link href="/cart" className="relative whitespace-nowrap" data-testid="헤더장바구니">
              장바구니
              {count > 0 && <span className="ml-1 text-accent" data-testid="헤더장바구니수량" data-count={count}>{count}</span>}
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
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-14 md:grid-cols-[1.3fr_1fr_1fr] md:px-8">
        <div>
          <Logo className="text-[1.7rem]" />
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
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-5 py-5 text-[0.75rem] font-normal text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>© things.</p>
          <p>이 사이트는 개인 포트폴리오용 데모 사이트입니다.</p>
        </div>
      </div>
    </footer>
  );
}
