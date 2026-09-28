"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/actions/commerce";
import { toggleWishlist } from "@/actions/wishlist";

export function ProductQuickActions({ productId, soldOut }: { productId: string; soldOut: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [wishlisted, setWishlisted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <button
          type="button"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-md hover:bg-black hover:text-white"
          aria-label="위시리스트에 추가"
          title="위시리스트"
          disabled={pending}
          onClick={() => startTransition(async () => {
            const result = await toggleWishlist(productId);
            if ("error" in result) { setMessage(result.error ?? "처리하지 못했습니다."); return; }
            setWishlisted(Boolean(result.added));
            setMessage(result.message ?? "처리되었습니다.");
            router.refresh();
          })}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
        </button>
        <button
          type="button"
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-md hover:bg-black hover:text-white disabled:opacity-40"
          aria-label="장바구니에 담기"
          title="장바구니 담기"
          disabled={pending || soldOut}
          onClick={() => startTransition(async () => {
            const result = await addToCart(productId, 1, false);
            setMessage(result.error ?? "장바구니에 담았습니다.");
            if (!result.error) router.refresh();
          })}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></svg>
        </button>
      </div>
      {message ? (
        <div
          className="fixed left-1/2 top-6 z-[150] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-xl"
          role="status"
        >
          {message}
        </div>
      ) : null}
    </>
  );
}
