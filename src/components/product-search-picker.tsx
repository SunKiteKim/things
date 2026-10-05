"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export type SearchableProduct = {
  id: string;
  name: string;
  imageUrl: string;
};

function ProductThumb({ src }: { src: string }) {
  return src ? (
    // Admin product URLs are not limited to the storefront image host.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-10 w-10 shrink-0 object-cover" />
  ) : (
    <span className="grid h-10 w-10 shrink-0 place-items-center bg-slate-100 text-[0.6rem] text-muted">없음</span>
  );
}

export function ProductSearchPicker({
  products,
  name,
  selected: initialSelected,
  idPrefix,
}: {
  products: SearchableProduct[];
  name: string;
  selected: string[];
  idPrefix: string;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const results = query === null ? [] : products.filter((product) => {
    const keyword = query.toLocaleLowerCase();
    return !keyword || product.id.toLocaleLowerCase().includes(keyword) || product.name.toLocaleLowerCase().includes(keyword);
  });
  const allResultsSelected = results.length > 0 && results.every((product) => selected.includes(product.id));

  function toggleProduct(productId: string) {
    setSelected((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  }

  function toggleAllResults() {
    setSelected((current) => {
      if (allResultsSelected) return current.filter((id) => !results.some((product) => product.id === id));
      return [...new Set([...current, ...results.map((product) => product.id)])];
    });
  }

  const dialog = open ? (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-black/40 px-5 py-10" role="presentation">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="상품 검색">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h3 className="text-xl font-bold">상품 검색</h3>
          <button type="button" className="text-2xl leading-none" aria-label="상품 검색 닫기" onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="border-b border-line p-6">
          <label className="text-sm font-bold" htmlFor={`${idPrefix}-${name}-search`}>상품ID 또는 상품명</label>
          <div className="mt-2 flex gap-2">
            <input id={`${idPrefix}-${name}-search`} className="field" value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setQuery(searchText.trim()); } }} />
            <button type="button" className="btn shrink-0" onClick={() => setQuery(searchText.trim())}>검색</button>
          </div>
          <p className="mt-2 text-xs text-muted">조건을 고르지 않고 검색하면 전체 상품이 표시됩니다.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {query === null ? (
            <p className="py-10 text-center text-sm text-muted">검색 버튼을 누르면 상품 목록이 표시됩니다.</p>
          ) : results.length ? (
            <>
              <label className="flex items-center gap-2 border-b border-line bg-[#f9fafb] px-3 py-3 text-sm font-bold">
                <input type="checkbox" checked={allResultsSelected} onChange={toggleAllResults} /> 전체 선택 ({results.length}개)
              </label>
              <div className="divide-y divide-line">
                {results.map((product) => (
                  <label key={product.id} className="grid cursor-pointer grid-cols-[auto_auto_1fr] items-center gap-3 px-3 py-3 text-sm hover:bg-[#f9fafb]">
                    <input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggleProduct(product.id)} />
                    <ProductThumb src={product.imageUrl} />
                    <span><strong>{product.name}</strong><span className="mt-1 block break-all text-xs text-muted">{product.id}</span></span>
                  </label>
                ))}
              </div>
            </>
          ) : <p className="py-10 text-center text-sm text-muted">검색 결과가 없습니다.</p>}
        </div>
        <div className="flex justify-end border-t border-line px-6 py-4">
          <button type="button" className="btn" onClick={() => setOpen(false)}>선택 완료</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div>
      {selected.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <div className="flex items-center justify-between border border-line bg-[#f9fafb] px-4 py-3">
        <span className="text-sm">선택된 상품 {selected.length}개</span>
        <button type="button" className="btn btn-ghost" onClick={() => { setSearchText(""); setQuery(null); setOpen(true); }}>상품 검색</button>
      </div>
      {selected.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((id) => {
            const product = products.find((item) => item.id === id);
            return (
              <button key={id} type="button" className="flex items-center gap-2 border border-line bg-white px-2 py-1.5 text-left text-xs" onClick={() => toggleProduct(id)} title="선택 해제">
                <ProductThumb src={product?.imageUrl ?? ""} />
                <span>{product?.name ?? "삭제된 상품"} <span className="text-muted">({id})</span> ×</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </div>
  );
}
