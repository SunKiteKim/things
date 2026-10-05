"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { ProductQuickActions } from "@/components/product-quick-actions";
import { formatPrice } from "@/lib/utils";
import { SHIPPING_NOTICE } from "@/lib/checkout-pricing";

export type TimeSaleItem = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  label: string | null;
  stock: number;
};

const VISIBLE = 3;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function countdown(end: string, now: number) {
  const target = new Date(end).getTime();
  if (!Number.isFinite(target)) return "";
  const diff = Math.max(0, target - now);
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor(diff / 60_000) % 60;
  const seconds = Math.floor(diff / 1_000) % 60;
  return `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
}

export function TimeSaleRail({ items, endsAt }: { items: TimeSaleItem[]; endsAt: string }) {
  const pages = Math.max(1, Math.ceil(items.length / VISIBLE));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timer = countdown(endsAt, now);
  const visible = items.slice(page * VISIBLE, page * VISIBLE + VISIBLE);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (paused || pages < 2) return;
    const slide = window.setInterval(() => setPage((current) => (current + 1) % pages), 5000);
    return () => window.clearInterval(slide);
  }, [paused, pages]);

  return (
    <section className="mx-auto w-full max-w-[1280px] px-5 py-12 md:px-8">
      <div className="text-center">
        <p className="font-serif text-2xl italic text-neutral-500">Special</p>
        <h2 className="mt-1 text-4xl font-black tracking-tight md:text-5xl">TIME SALE</h2>
        {timer ? <p className="mt-3 text-3xl font-bold tabular-nums tracking-wide md:text-4xl">{timer}</p> : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">등록된 타임세일 상품이 없습니다.</p>
      ) : (
        <div className="relative mt-10">
          <button type="button" aria-label="이전 타임세일" className="absolute left-0 top-[28%] z-10 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-neutral-200 bg-white shadow" onClick={() => setPage((current) => (current - 1 + pages) % pages)}>‹</button>
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {visible.map((item) => (
              <article key={item.id} className="min-w-0">
                <div className="relative">
                  <Link href={`/product/${item.id}`} className="block">
                    <div className="relative aspect-square overflow-hidden bg-[#f6f6f4]">
                      <ProductImage src={item.imageUrl} alt={item.name} fill />
                    </div>
                  </Link>
                  <ProductQuickActions productId={item.id} soldOut={item.stock <= 0} />
                </div>
                <Link href={`/product/${item.id}`} className="mt-3 block">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
                    {item.label ? <span className="text-[#e10600]">{item.label.replace("쿠폰 ", "").replace("기획전 ", "")}</span> : null}
                    <span className="font-bold text-[#e10600]">{formatPrice(item.price)}</span>
                  </p>
                  {item.originalPrice && item.originalPrice > item.price ? (
                    <p className="text-xs text-neutral-400 line-through">{formatPrice(item.originalPrice)}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-neutral-500">{SHIPPING_NOTICE}</p>
                </Link>
              </article>
            ))}
          </div>
          <button type="button" aria-label="다음 타임세일" className="absolute right-0 top-[28%] z-10 grid h-10 w-10 translate-x-1/2 place-items-center rounded-full border border-neutral-200 bg-white shadow" onClick={() => setPage((current) => (current + 1) % pages)}>›</button>
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-neutral-500">
            <span>{page + 1} / {pages}</span>
            <button type="button" aria-label={paused ? "타임세일 재생" : "타임세일 일시정지"} className="grid h-7 w-7 place-items-center rounded-full border border-neutral-300" onClick={() => setPaused((current) => !current)}>{paused ? "▶" : "Ⅱ"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
