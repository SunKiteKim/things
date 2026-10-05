import type { DiscountBoard } from "@/lib/product-discounts";
import { formatPrice } from "@/lib/utils";

export function ProductDiscountBoard({ board }: { board: DiscountBoard }) {
  return (
    <section className="mt-8 max-w-3xl border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-base font-semibold">적용 할인</h2>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-muted">
          <tr>
            <th className="px-4 py-3">할인</th>
            <th className="px-4 py-3">내용</th>
            <th className="px-4 py-3 text-right">적용 금액</th>
          </tr>
        </thead>
        <tbody>
          {board.lines.map((line) => (
            <tr key={`${line.name}-${line.detail}`} className="border-t border-line">
              <td className="px-4 py-3 font-medium">{line.name}</td>
              <td className="px-4 py-3 text-muted">{line.detail}</td>
              <td className="px-4 py-3 text-right">{line.priceLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid gap-1 border-t border-line px-4 py-3 text-sm">
        <p>최종 구매가 {formatPrice(board.purchasePrice)}</p>
        <p>프론트 노출가 {formatPrice(board.shownPrice)} · {board.shownLabel}</p>
      </div>
    </section>
  );
}
