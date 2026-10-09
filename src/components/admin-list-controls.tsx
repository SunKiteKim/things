"use client";

import { Children, isValidElement, useState, type ReactNode } from "react";

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;
export type AppliedQuery = { query: string; field: string; filters: Record<string, string> };
export type AdminListRowMeta = {
  searchText?: string;
  searchFields?: Record<string, string>;
  facets?: Record<string, string>;
  sortValues?: Record<string, string | number | null>;
};
export type AdminFilter = { key: string; label: string; options: { value: string; label: string }[] };
export type AdminSearchConfig = { placeholder?: string; fields?: { value: string; label: string }[] };

export function compareSortValues(a: string | number | null | undefined, b: string | number | null | undefined, dir: SortDir) {
  const empty = (value: typeof a) => value === null || value === undefined || value === "";
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return 1;
  if (empty(b)) return -1;
  const cmp = typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), "ko", { numeric: true, sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

export function isQueryActive(applied: AppliedQuery) {
  return Boolean(applied.query.trim()) || Object.values(applied.filters).some(Boolean);
}

export function filterAndSortRows<T extends AdminListRowMeta>(rows: T[], applied: AppliedQuery, sort: SortState | null) {
  const query = applied.query.trim().toLocaleLowerCase();
  const filtered = rows.filter((row) => {
    for (const [key, value] of Object.entries(applied.filters)) {
      if (value && (row.facets?.[key] ?? "") !== value) return false;
    }
    if (!query) return true;
    if (applied.field) return (row.searchFields?.[applied.field] ?? "").toLocaleLowerCase().includes(query);
    if (row.searchText) return row.searchText.toLocaleLowerCase().includes(query);
    return Object.values(row.searchFields ?? {}).some((value) => value.toLocaleLowerCase().includes(query));
  });
  if (!sort) return filtered;
  return filtered
    .map((row, index) => ({ row, index }))
    .sort((left, right) => compareSortValues(left.row.sortValues?.[sort.key], right.row.sortValues?.[sort.key], sort.dir) || left.index - right.index)
    .map(({ row }) => row);
}

export function useAdminListState() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [draftField, setDraftField] = useState("");
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<AppliedQuery>({ query: "", field: "", filters: {} });

  function setFilter(key: string, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applySearch() {
    const filters = { ...draftFilters };
    const empty = !draftQuery.trim() && !Object.values(filters).some(Boolean);
    setApplied({ query: draftQuery, field: draftField, filters });
    if (empty) setSort(null);
    setPage(1);
  }

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(1);
  }

  return { page, setPage, sort, toggleSort, draftQuery, setDraftQuery, draftField, setDraftField, draftFilters, setFilter, applied, applySearch };
}

export function AdminSearchBar({
  query,
  field,
  fields,
  filters,
  filterValues,
  placeholder,
  onQuery,
  onField,
  onFilter,
  onSearch,
}: {
  query: string;
  field: string;
  fields?: { value: string; label: string }[];
  filters?: AdminFilter[];
  filterValues: Record<string, string>;
  placeholder?: string;
  onQuery: (value: string) => void;
  onField: (value: string) => void;
  onFilter: (key: string, value: string) => void;
  onSearch: () => void;
}) {
  return (
    <form className="admin-search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
      {fields?.length ? (
        <label>
          검색 항목
          <select className="field" value={field} onChange={(event) => onField(event.target.value)}>
            <option value="">전체</option>
            {fields.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      ) : null}
      <label className="grow">
        검색어
        <input className="field" value={query} placeholder={placeholder ?? "검색어를 입력하세요"} autoComplete="off" onChange={(event) => onQuery(event.target.value)} />
      </label>
      {filters?.map((filter) => (
        <label key={filter.key}>
          {filter.label}
          <select className="field" value={filterValues[filter.key] ?? ""} onChange={(event) => onFilter(filter.key, event.target.value)}>
            <option value="">전체</option>
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      <div className="self-end">
        <button className="btn" type="submit">검색</button>
      </div>
    </form>
  );
}

export function SortButton({ label, active, dir, onClick, ariaLabel }: { label: string; active: boolean; dir?: SortDir; onClick: () => void; ariaLabel?: string }) {
  const direction = active ? (dir === "asc" ? "오름차순" : "내림차순") : "정렬";
  return (
    <button type="button" className="admin-sort" data-active={active ? "true" : "false"} aria-label={ariaLabel ? `${ariaLabel}, ${direction}` : `${label} ${direction}`} title={direction} onClick={onClick}>
      {label}
      <span aria-hidden="true">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export function SortableTable({ columns, children }: { columns: { label: string; sortKey?: string }[]; children: ReactNode }) {
  const [sort, setSort] = useState<SortState>(null);
  const items = Children.toArray(children);
  const sorted = !sort ? items : [...items].sort((left, right) => {
    const leftValue = readSortValue(left, sort.key);
    const rightValue = readSortValue(right, sort.key);
    if (leftValue === null && rightValue === null) return 0;
    if (leftValue === null) return 1;
    if (rightValue === null) return -1;
    const cmp = leftValue.number - rightValue.number || leftValue.id.localeCompare(rightValue.id);
    return sort.dir === "asc" ? cmp : -cmp;
  });

  function toggle(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={`${column.label}-${index}`}>
                {column.sortKey ? (
                  <SortButton label={column.label} active={sort?.key === column.sortKey} dir={sort?.dir} onClick={() => toggle(column.sortKey!)} />
                ) : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{sorted}</tbody>
      </table>
    </div>
  );
}

function readSortValue(node: ReactNode, key: string) {
  if (!isValidElement(node)) return null;
  const props = node.props as Record<string, unknown>;
  const raw = props[`data-sort-${key}`];
  if (raw === undefined || raw === null || raw === "") return null;
  const number = Number(raw);
  if (!Number.isFinite(number)) return null;
  return { number, id: String(props["data-row-id"] ?? "") };
}
