"use client";

import Link from "next/link";
import { useState } from "react";
import { SortButton, compareSortValues, type SortState } from "@/components/admin-list-controls";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  email: string;
  name: string;
  amount: string;
  status: string;
  createdAt: number;
  createdLabel: string;
};

export function AdminOrdersTable({ rows }: { rows: AdminOrderRow[] }) {
  const [sort, setSort] = useState<SortState>(null);
  const view = !sort
    ? rows
    : rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => compareSortValues(left.row.createdAt, right.row.createdAt, sort.dir) || left.index - right.index)
      .map(({ row }) => row);

  function toggleSort() {
    setSort((current) => {
      if (!current) return { key: "date", dir: "asc" };
      if (current.dir === "asc") return { key: "date", dir: "desc" };
      return null;
    });
  }

  return (
    <>
    <p className="mt-8 text-sm text-muted" data-testid="총등록개수">총 {rows.length.toLocaleString("ko-KR")}개 등록</p>
    <table className="mt-4 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line text-muted">
          <th className="py-3">No</th>
          <th>주문번호</th>
          <th>이메일</th>
          <th>이름</th>
          <th>금액</th>
          <th>상태</th>
          <th>
            <SortButton label="일시" active={Boolean(sort)} dir={sort?.dir} onClick={toggleSort} />
          </th>
        </tr>
      </thead>
      <tbody>
        {view.length ? view.map((order, index) => (
          <tr key={order.id} className="border-b border-line">
            <td className="py-4">{index + 1}</td>
            <td><Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
            <td>{order.email}</td>
            <td>{order.name}</td>
            <td>{order.amount}</td>
            <td>{order.status}</td>
            <td>{order.createdLabel}</td>
          </tr>
        )) : (
          <tr>
            <td colSpan={7} className="py-12 text-center text-muted">등록된 주문이 없습니다.</td>
          </tr>
        )}
      </tbody>
    </table>
    </>
  );
}
