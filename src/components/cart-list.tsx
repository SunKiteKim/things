"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCartLines } from "@/actions/commerce";
import { CartControls } from "@/components/cart-controls";
import { formatPrice } from "@/lib/utils";

type CartRow = {
  productId: string;
  quantity: number;
  onePlusOne?: boolean;
  product: { id: string; name: string; price: number; imageUrl: string };
};

function rowKey(row: CartRow) {
  return `${row.productId}:${row.onePlusOne ? "1" : "0"}`;
}

export function CartList({ rows }: { rows: CartRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const keys = useMemo(() => rows.map(rowKey), [rows]);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const allSelected = keys.length > 0 && keys.every((key) => selected.includes(key));

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  function remove(keysToRemove: string[]) {
    const lines = rows.filter((row) => keysToRemove.includes(rowKey(row))).map((row) => ({ productId: row.productId, onePlusOne: row.onePlusOne }));
    startTransition(async () => {
      const result = await removeCartLines(lines);
      setMessage(result.error ?? result.message ?? "처리되었습니다.");
      if (!result.error) {
        setSelected((current) => current.filter((key) => !keysToRemove.includes(key)));
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-ink pb-3">
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : keys)} /> 전체 선택</label><span className="text-sm text-muted">총 {totalQuantity}개</span></div>
        <button type="button" className="text-sm underline underline-offset-4 disabled:text-muted" disabled={pending || selected.length === 0} onClick={() => remove(selected)}>선택삭제</button>
      </div>
      <div className="space-y-0">
        {rows.map((row) => {
          const key = rowKey(row);
          return (
            <div key={key} className="relative grid grid-cols-[24px_96px_1fr] gap-4 border-b border-line py-6">
              <input className="mt-1" type="checkbox" aria-label={`${row.product.name} 선택`} checked={selected.includes(key)} onChange={() => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} />
              <div className="relative aspect-square overflow-hidden bg-surface"><Image src={row.product.imageUrl} alt={row.product.name} fill className="object-cover" /></div>
              <div className="pr-14">
                <button type="button" className="absolute right-0 top-5 text-xs text-muted underline underline-offset-4 hover:text-ink" disabled={pending} onClick={() => remove([key])}>삭제</button>
                <Link href={`/product/${row.product.id}`} className="product-name">{row.product.name}</Link>
                <p className="mt-1 text-sm text-muted">{formatPrice(row.product.price)}</p>
                {row.onePlusOne ? <p className="mt-1 text-sm">1+1 · 구매 {row.quantity}개 + 증정 {row.quantity}개</p> : null}
                <CartControls productId={row.productId} quantity={row.quantity} onePlusOne={row.onePlusOne} />
              </div>
            </div>
          );
        })}
      </div>
      {message ? <div className="fixed bottom-6 right-6 z-[150] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl" role="status">{message}</div> : null}
    </div>
  );
}
