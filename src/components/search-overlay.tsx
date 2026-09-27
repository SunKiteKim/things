"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "things:recent-searches";
const RECENT_LIMIT = 6;

function loadRecentSearches() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function storeRecentSearches(searches: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches.slice(0, RECENT_LIMIT)));
}

export function SearchOverlay() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function showSearch() {
    setRecent(loadRecentSearches());
    setQuery("");
    setOpen(true);
  }

  function search(keyword: string) {
    const value = keyword.trim();
    if (!value) return;
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, RECENT_LIMIT);
    storeRecentSearches(next);
    setRecent(next);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  function clearRecent() {
    window.localStorage.removeItem(STORAGE_KEY);
    setRecent([]);
  }

  return (
    <>
      <button
        type="button"
        aria-label="검색"
        title="검색"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-surface"
        onClick={showSearch}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/55 px-5 pt-[12vh] backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-overlay-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-white p-6 shadow-2xl md:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-normal uppercase tracking-[0.28em] text-muted">Search</p>
                <h2 id="search-overlay-title" className="display mt-1 text-3xl">무엇을 찾으세요?</h2>
              </div>
              <button type="button" aria-label="검색창 닫기" className="grid h-10 w-10 place-items-center text-2xl font-light" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <form
              className="mt-8 flex border-b border-ink"
              onSubmit={(event) => {
                event.preventDefault();
                search(query);
              }}
            >
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent px-1 py-4 text-lg outline-none placeholder:text-muted"
                placeholder="검색어를 입력하세요"
                aria-label="검색어"
              />
              <button type="submit" className="grid w-12 place-items-center" aria-label="검색하기" disabled={!query.trim()}>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
              </button>
            </form>

            <div className="mt-7 min-h-20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">최근 검색어</p>
                {recent.length ? (
                  <button type="button" className="text-xs font-normal text-muted underline underline-offset-4" onClick={clearRecent}>
                    전체 삭제
                  </button>
                ) : null}
              </div>
              {recent.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <button key={item} type="button" className="rounded-full border border-line px-4 py-2 text-sm font-normal transition hover:border-ink" onClick={() => search(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm font-normal text-muted">최근 검색어가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
