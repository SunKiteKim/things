"use client";

import { useState } from "react";

export type AdminMasterDetailRow = {
  id: string;
  cells: React.ReactNode[];
  detail: React.ReactNode;
};

export function AdminMasterDetail({
  listTitle,
  detailTitle,
  columns,
  rows,
  pageSize = 5,
}: {
  listTitle: string;
  detailTitle: string;
  columns: string[];
  rows: AdminMasterDetailRow[];
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const selected = rows.find((row) => row.id === selectedId);

  function movePage(next: number) {
    setPage(next);
    setSelectedId("");
  }

  return (
    <>
      <h2 className="mt-8 text-base font-semibold">{listTitle}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {pageRows.length ? pageRows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-t border-line transition hover:bg-slate-50 ${selectedId === row.id ? "bg-slate-100" : ""}`}
                tabIndex={0}
                role="button"
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(row.id); } }}
              >
                {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
              </tr>
            )) : <tr><td colSpan={columns.length} className="py-12 text-center text-muted">등록된 항목이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex justify-center gap-2" aria-label={`${listTitle} 페이지`}>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <button key={number} type="button" className={`h-8 min-w-8 rounded border px-2 text-xs ${page === number ? "border-slate-700 bg-slate-700 text-white" : "border-line bg-white"}`} aria-current={page === number ? "page" : undefined} onClick={() => movePage(number)}>{number}</button>
        ))}
      </nav>
      {selected ? (
        <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="border-b border-line pb-4 text-base font-semibold">{detailTitle}</h2>
          <div className="mt-6">{selected.detail}</div>
        </section>
      ) : null}
    </>
  );
}
