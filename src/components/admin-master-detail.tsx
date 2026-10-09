"use client";

import { useState } from "react";
import { AdminSearchBar, SortButton, filterAndSortRows, isQueryActive, useAdminListState, type AdminFilter, type AdminListRowMeta, type AdminSearchConfig } from "@/components/admin-list-controls";

export type AdminColumn = string | { label: string; sortKey?: string };
export type AdminMasterDetailRow = AdminListRowMeta & {
  id: string;
  cells: React.ReactNode[];
  detail: React.ReactNode;
};

function columnMeta(column: AdminColumn) {
  return typeof column === "string" ? { label: column } : column;
}

export function AdminMasterDetail({
  listTitle,
  detailTitle,
  columns,
  rows,
  pageSize = 5,
  search,
  filters,
}: {
  listTitle: string;
  detailTitle: string;
  columns: AdminColumn[];
  rows: AdminMasterDetailRow[];
  pageSize?: number;
  search?: AdminSearchConfig;
  filters?: AdminFilter[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const { page, setPage, sort, toggleSort, draftQuery, setDraftQuery, draftField, setDraftField, draftFilters, setFilter, applied, applySearch } = useAdminListState();
  const view = filterAndSortRows(rows, applied, sort);
  const pageCount = Math.max(1, Math.ceil(view.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = view.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = view.find((row) => row.id === selectedId);
  const showSearch = Boolean(search || filters?.length);
  const heads = columns.map(columnMeta);

  function movePage(next: number) {
    setPage(next);
    setSelectedId("");
  }

  function submitSearch() {
    applySearch();
    setSelectedId("");
  }

  return (
    <>
      <div className="mt-8 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{listTitle}</h2>
        <p className="text-sm text-muted" data-testid="총등록개수">총 {rows.length.toLocaleString("ko-KR")}개 등록</p>
      </div>
      {showSearch ? (
        <>
          <AdminSearchBar
            query={draftQuery}
            field={draftField}
            fields={search?.fields}
            filters={filters}
            filterValues={draftFilters}
            placeholder={search?.placeholder}
            onQuery={setDraftQuery}
            onField={setDraftField}
            onFilter={setFilter}
            onSearch={submitSearch}
          />
          {isQueryActive(applied) ? <p className="mt-3 text-sm text-muted">검색 결과 {view.length}건</p> : null}
        </>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>No</th>
              {heads.map((column, index) => (
                <th key={`${column.label}-${index}`}>
                  {column.sortKey ? (
                    <SortButton label={column.label} active={sort?.key === column.sortKey} dir={sort?.dir} onClick={() => toggleSort(column.sortKey!)} />
                  ) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? pageRows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-t border-line transition hover:bg-slate-50 ${selectedId === row.id ? "bg-slate-100" : ""}`}
                tabIndex={0}
                role="button"
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(row.id); } }}
              >
                <td>{(currentPage - 1) * pageSize + rowIndex + 1}</td>
                {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
              </tr>
            )) : <tr><td colSpan={columns.length + 1} className="py-12 text-center text-muted">{isQueryActive(applied) ? "검색 결과가 없습니다." : "등록된 항목이 없습니다."}</td></tr>}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex justify-center gap-2" aria-label={`${listTitle} 페이지`}>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <button key={number} type="button" className={`h-8 min-w-8 rounded border px-2 text-xs ${currentPage === number ? "border-slate-700 bg-slate-700 text-white" : "border-line bg-white"}`} aria-current={currentPage === number ? "page" : undefined} onClick={() => movePage(number)}>{number}</button>
        ))}
      </nav>
      {selected ? (
        <section className="mt-8 rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="border-b border-line pb-4 text-base font-semibold">{detailTitle}</h2>
          <div className="mt-6" key={selected.id}>{selected.detail}</div>
        </section>
      ) : null}
    </>
  );
}
