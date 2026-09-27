"use client";

import { Children, useState } from "react";

export function AdminPagedList({ children, pageSize = 10 }: { children: React.ReactNode; pageSize?: number }) {
  const [page, setPage] = useState(1);
  const items = Children.toArray(children);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  return (
    <>
      <div className="mt-8 space-y-4">{items.slice((page - 1) * pageSize, page * pageSize)}</div>
      <nav className="mt-5 flex justify-center gap-2" aria-label="상품 전시 목록 페이지">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} type="button" className={`h-8 min-w-8 rounded border px-2 text-xs ${page === number ? "border-slate-700 bg-slate-700 text-white" : "border-line bg-white"}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
      </nav>
    </>
  );
}
