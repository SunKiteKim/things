"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { downloadCartCoupon, selectCartCoupon } from "@/actions/commerce";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/product-image";
import { couponCodes, couponSelection, couponTargets, allocateCouponDiscounts, bestSingleProductCoupon, shippingFee } from "@/lib/checkout-pricing";

export type CouponProductDiscount = { productId: string; onePlusOne?: boolean; discount: number; rate: number };
export type CouponOption = { code: string; selection?: string; label: string; eligible: boolean; discount: number; isStackable: boolean; scope?: string; summary?: string; discountType?: string; discountValue?: number; productDiscounts?: CouponProductDiscount[] };
export type CouponProductRow = { key: string; productId: string; onePlusOne?: boolean; name: string; price: number; quantity?: number; imageUrl: string };
export type CouponNotice = { key: string; summary: string; reason: string };
export type DownloadableCoupon = { id: string; name: string; discount: string; endsLabel: string };

function discountFace(discount: string) {
  if (discount.endsWith("원")) return { value: discount.slice(0, -1), unit: "원" };
  return { value: discount, unit: "" };
}

function DownloadMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function DownloadCouponCard({ coupon, pending, onDownload }: { coupon: DownloadableCoupon; pending: boolean; onDownload: (id: string) => void }) {
  const face = discountFace(coupon.discount);
  return (
    <article className="relative flex min-h-[118px] rounded-md border border-[#e6e6e6] bg-white">
      <div className="min-w-0 flex-1 px-3 py-3">
        <p className="font-bold leading-none text-[#e10600]" style={{ fontSize: face.value.length > 6 ? "18px" : "22px" }}>
          {face.value}{face.unit ? <span style={{ marginLeft: "2px", fontSize: "13px", fontWeight: 700 }}> {face.unit}</span> : null}
        </p>
        <p className="mt-2 line-clamp-2 text-[13px] leading-4">{coupon.name}</p>
        <p className="mt-2 text-[11px] leading-4 text-muted">{coupon.endsLabel}</p>
      </div>
      <div className="relative flex w-10 shrink-0 items-center justify-center">
        <span className="absolute inset-y-3 left-0 border-l border-dashed border-[#d9d9d9]" />
        <button type="button" aria-label={`${coupon.name} 다운`} disabled={pending} onClick={() => onDownload(coupon.id)} className="text-[#3f3b37] disabled:opacity-40" style={{ border: 0, background: "transparent", padding: 0 }}>
          <DownloadMark />
        </button>
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className="pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-white" style={{ right: "-5px", top: `${14 + index * 16}%`, boxShadow: "inset 0 0 0 1px #e6e6e6" }} />
      ))}
    </article>
  );
}

function DownloadableCoupons({ coupons }: { coupons: DownloadableCoupon[] }) {
  const router = useRouter();
  const [claimed, setClaimed] = useState<string[]>([]);
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const rows = coupons.filter((coupon) => !claimed.includes(coupon.id));
  if (!rows.length) return null;
  return (
    <section className="mt-6">
      <h3 className="text-base font-bold">다운로드 가능 쿠폰 ({rows.length})</h3>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 7.2V11" />
          <circle cx="8" cy="5.1" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        다운받은 뒤 위 목록에서 적용해 주세요.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {rows.map((coupon) => (
          <DownloadCouponCard key={coupon.id} coupon={coupon} pending={downloading === coupon.id} onDownload={(id) => {
            setDownloading(id);
            setDownloadError("");
            void (async () => {
              try {
                const result = await downloadCartCoupon(id);
                if (result && "error" in result && result.error) {
                  setDownloadError(result.error);
                  return;
                }
                setClaimed((current) => [...current, id]);
                router.refresh();
              } finally {
                setDownloading("");
              }
            })();
          }} />
        ))}
      </div>
      {downloadError ? <p className="mt-2 text-sm text-accent" role="alert">{downloadError}</p> : null}
    </section>
  );
}

const PRODUCT_SCOPES = new Set(["PRODUCT", "ONE_PLUS_ONE"]);

function isProductCoupon(scope?: string) {
  return !!scope && PRODUCT_SCOPES.has(scope);
}

function rowTarget(row: Pick<CouponProductRow, "productId" | "onePlusOne">) {
  return `${row.productId}:${row.onePlusOne ? "1" : "0"}`.toLowerCase();
}

function dealFor(option: CouponOption, row: CouponProductRow) {
  return option.productDiscounts?.find((item) => item.productId === row.productId && !!item.onePlusOne === !!row.onePlusOne);
}

function toggleToken(current: string, option: CouponOption, allOptions: CouponOption[]) {
  const parts = couponSelection(current);
  if (couponCodes(current).includes(option.code)) return parts.filter((part) => part.split("@")[0] !== option.code).join(",");
  if (!option.isStackable) return option.selection ?? option.code;
  const kept = parts.filter((part) => allOptions.find((candidate) => candidate.code === part.split("@")[0])?.isStackable);
  return [...kept, option.selection ?? option.code].join(",");
}

function assignProductCoupon(current: string, option: CouponOption, target: string, allOptions: CouponOption[]) {
  if (!option.isStackable) return `${option.code}@${target}`;
  const kept = couponSelection(current).filter((part) => {
    const code = part.split("@")[0];
    if (code === option.code) return false;
    const candidate = allOptions.find((item) => item.code === code);
    if (!candidate?.isStackable) return false;
    return !(isProductCoupon(candidate.scope) && couponTargets(part)[code] === target);
  });
  return [...kept, `${option.code}@${target}`].join(",");
}

function clearRowCoupon(current: string, target: string) {
  return couponSelection(current).filter((part) => couponTargets(part)[part.split("@")[0]] !== target).join(",");
}

function assignedCode(current: string, target: string) {
  return Object.entries(couponTargets(current)).find(([, value]) => value === target)?.[0] ?? "";
}

export function CouponPicker({ options, selected, subtotal, onApply, showApplied = true, opened, onOpenedChange, title = "쿠폰 변경", groups, initialGroup, products, notices = [], signedIn = true, downloads = [] }: { options: CouponOption[]; selected: string; subtotal: number; onApply: (option: CouponOption) => Promise<void>; showApplied?: boolean; opened?: boolean; onOpenedChange?: (open: boolean) => void; title?: string; groups?: { id: string; label: string; options: CouponOption[] }[]; initialGroup?: string; products?: CouponProductRow[]; notices?: CouponNotice[]; signedIn?: boolean; downloads?: DownloadableCoupon[] }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = opened ?? localOpen;
  function setOpen(next: boolean) {
    setLocalOpen(next);
    onOpenedChange?.(next);
  }
  const [groupId, setGroupId] = useState(initialGroup ?? groups?.[0]?.id ?? "");
  const [code, setCode] = useState(selected);
  const [checked, setChecked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const allOptions = groups ? groups.flatMap((group) => group.options) : options;
  const visibleOptions = groups ? groups.find((group) => group.id === groupId)?.options ?? [] : options;
  const checkedRows = products?.length ? products.filter((row) => checked.includes(row.key)) : null;
  const previewSubtotal = checkedRows ? checkedRows.reduce((sum, row) => sum + row.price * (row.quantity && row.quantity > 0 ? row.quantity : 1), 0) : subtotal;
  const previews = allOptions.filter(option => couponCodes(code).includes(option.code)).flatMap((option) => {
    if (checkedRows && isProductCoupon(option.scope)) {
      const target = couponTargets(code)[option.code];
      const row = target ? checkedRows.find((item) => rowTarget(item) === target) : undefined;
      const deal = row ? dealFor(option, row) : undefined;
      return deal ? [{ ...option, discount: deal.discount }] : [];
    }
    if (checkedRows && option.scope === "MULTI_CART" && new Set(checkedRows.map((row) => row.productId)).size < 2) return [];
    if (checkedRows && !isProductCoupon(option.scope)) {
      const discount = option.discountType === "PERCENT" && typeof option.discountValue === "number"
        ? Math.floor(previewSubtotal * option.discountValue / 100)
        : option.discountType === "AMOUNT" && typeof option.discountValue === "number"
          ? Math.min(option.discountValue, previewSubtotal)
          : subtotal > 0 ? Math.round(option.discount * previewSubtotal / subtotal) : 0;
      return discount > 0 ? [{ ...option, discount }] : [];
    }
    const target = couponTargets(code)[option.code];
    const matched = target ? option.productDiscounts?.find((item) => `${item.productId}:${item.onePlusOne ? "1" : "0"}`.toLowerCase() === target) : undefined;
    return [matched ? { ...option, discount: matched.discount } : option];
  });
  let previewTotal = 0;
  let selectionError = "";
  let allocated: (CouponOption & { amount: number })[] = [];
  try {
    allocated = allocateCouponDiscounts(previews, previewSubtotal);
    previewTotal = allocated.reduce((sum, option) => sum + option.amount, 0);
  } catch {
    selectionError = "중복 불가 쿠폰은 단독으로 적용해 주세요.";
  }
  const preview = previews.length ? { ...previews[0], code: couponSelection(code).filter((part) => previews.some((option) => option.code === part.split("@")[0])).join(","), label: previews.map(option => option.label).join(" + "), discount: previewTotal } : undefined;
  const productRows = products ?? [];
  const showProductMatcher = productRows.length > 0 && groupId === "product";
  const applied = options.filter(option => couponCodes(selected).includes(option.code)).map(option => option.label).join(" + ");

  const productKeys = (products ?? []).map((row) => row.key).join(",");
  useEffect(() => {
    if (!open) return;
    setCode(selected);
    setError("");
    setChecked(productKeys ? productKeys.split(",") : []);
    if (initialGroup) setGroupId(initialGroup);
  }, [open, selected, initialGroup, productKeys]);

  return (
    <div className={showApplied ? "mt-5" : undefined}>
      {showApplied ? (
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-medium">적용 쿠폰</p><p className="mt-1 text-xs text-muted">{applied || "적용 가능한 쿠폰 없음"}</p></div>
          <button type="button" className="btn btn-ghost shrink-0" onClick={() => setOpen(true)} disabled={!options.length}>쿠폰변경</button>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/45 px-5 py-10" role="presentation">
          <div className="flex max-h-[82vh] w-full max-w-xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="coupon-picker-title">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div><h2 id="coupon-picker-title" className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-muted">적용할 쿠폰과 예상 결제금액을 확인해 주세요.</p></div>
              <button type="button" className="text-2xl leading-none" aria-label="쿠폰 변경 닫기" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {groups ? (
                <div className="-mx-6 mb-4 flex border-b border-line text-sm">
                  {groups.map((group) => {
                    const appliedHere = group.options.some((option) => couponCodes(code).includes(option.code));
                    const active = group.id === groupId;
                    return (
                      <button key={group.id} type="button" className={`w-1/2 px-2 pb-2 text-center ${active ? "border-b-2 border-ink" : "text-muted"}`} style={{ fontWeight: active ? 700 : 400, marginBottom: "-1px" }} onClick={() => setGroupId(group.id)}>
                        <span className="block">{group.label}</span>
                        <span className="block leading-none" style={{ marginTop: "2px", fontSize: "11px", fontWeight: 400, color: "#e10600", visibility: appliedHere ? "visible" : "hidden" }} aria-hidden={!appliedHere}>적용 중</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {showProductMatcher ? (
                <div>
                  <button type="button" className="btn mb-4 w-full" style={{ minHeight: "2.25rem", background: "#161412", color: "#fff", borderColor: "#161412" }} onClick={() => {
                    const rows = productRows.filter((row) => checked.includes(row.key));
                    if (!rows.length) {
                      setError("상품을 선택해 주세요.");
                      return;
                    }
                    const scoped = allOptions.map((option) => {
                      if (!isProductCoupon(option.scope)) return option;
                      const deals = option.productDiscounts?.filter((deal) => rows.some((row) => row.productId === deal.productId && !!row.onePlusOne === !!deal.onePlusOne)) ?? [];
                      return { ...option, productDiscounts: deals, discount: deals[0]?.discount ?? 0 };
                    });
                    const merchandise = rows.reduce((sum, row) => sum + row.price * (row.quantity && row.quantity > 0 ? row.quantity : 1), 0);
                    setError("");
                    setCode(bestSingleProductCoupon(scoped, code, merchandise).selection);
                  }}>최대 할인 적용</button>
                  {!signedIn ? <p className="mb-3 text-sm text-muted">로그인 후 다운받은 쿠폰을 적용할 수 있습니다.</p> : null}
                  <div className="divide-y divide-line border border-line">
                    {productRows.map((row) => {
                      const fits = allOptions.filter((option) => isProductCoupon(option.scope) && dealFor(option, row));
                      const selectedCode = assignedCode(code, rowTarget(row));
                      const chosen = fits.find((option) => option.code === selectedCode);
                      const deal = chosen ? dealFor(chosen, row) : undefined;
                      const quantity = row.quantity && row.quantity > 0 ? row.quantity : 1;
                      const rowChecked = checked.includes(row.key);
                      const appliedDiscount = rowChecked && chosen ? allocated.find(option => option.code === chosen.code)?.amount ?? 0 : 0;
                      const appliedPrice = Math.max(0, row.price * quantity - appliedDiscount);
                      return (
                        <div key={row.key} className="flex items-start gap-3 px-4 py-4">
                          <input className="mt-1" type="checkbox" aria-label={`${row.name} 선택`} checked={checked.includes(row.key)} onChange={() => setChecked((current) => current.includes(row.key) ? current.filter((key) => key !== row.key) : [...current, row.key])} />
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-surface"><ProductImage src={row.imageUrl} alt={row.name} fill /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold">{row.name}{row.onePlusOne ? " · 1+1" : ""}</p>
                                <p className="mt-0.5 text-xs text-muted">{row.productId}</p>
                                <p className="mt-0.5 text-xs text-muted">수량 {quantity}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                {deal && rowChecked ? (
                                  <>
                                    <p className="text-sm line-through" style={{ fontWeight: 400, color: "#c5c0b8" }}>{formatPrice(row.price)}</p>
                                    <p className="text-sm" style={{ fontWeight: 700, color: "#3f3b37" }}>{formatPrice(Math.max(0, Math.floor(appliedPrice / quantity)))}</p>
                                  </>
                                ) : <p className="text-sm font-bold">{formatPrice(row.price)}</p>}
                              </div>
                            </div>
                            {signedIn ? (
                              <select className="field mt-2" style={{ padding: "0.45rem 0.7rem", fontSize: "13px" }} value={selectedCode} onChange={(event) => {
                                const next = event.target.value;
                                setError("");
                                if (!next) {
                                  setCode(clearRowCoupon(code, rowTarget(row)));
                                  return;
                                }
                                const option = fits.find((item) => item.code === next);
                                if (!option) return;
                                setCode(assignProductCoupon(code, option, rowTarget(row), allOptions));
                              }}>
                                <option value="">{fits.length ? "쿠폰 선택" : "상품에 바로 적용할 수 있는 쿠폰이 없습니다."}</option>
                                {fits.map((option) => {
                                  const itemDeal = dealFor(option, row);
                                  return <option key={option.code} value={option.code}>{option.summary ?? option.label} · -{formatPrice(itemDeal?.discount ?? 0)}</option>;
                                })}
                                {notices.filter((notice) => notice.key === row.key).map((notice) => (
                                  <option key={`${notice.summary}-${notice.reason}`} value={`blocked:${notice.summary}`} disabled>{notice.summary} · {notice.reason}</option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : visibleOptions.length ? (
              <div className="divide-y divide-line border border-line">
                {visibleOptions.map((option) => (
                  <label key={option.code} className={`grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-4 ${option.eligible ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed opacity-45"}`}>
                    <input type="checkbox" name="coupon-option" checked={couponCodes(code).includes(option.code)} disabled={!option.eligible} onChange={() => setCode((current) => toggleToken(current, option, allOptions))} />
                    <span className="text-sm"><strong>{option.label}</strong><span className="mt-1 block text-xs text-muted">{option.code} · 중복 적용 {option.isStackable ? "가능" : "불가"}</span></span>
                    <span className="text-sm font-semibold text-accent">-{formatPrice(option.discount)}</span>
                  </label>
                ))}
              </div>
              ) : <p className="border border-line py-10 text-center text-sm text-muted">{signedIn ? "적용 가능한 쿠폰이 없습니다." : "로그인 후 다운받은 쿠폰을 적용할 수 있습니다."}</p>}
              <div className="mt-5 bg-slate-50 px-4 py-4 text-sm">
                <p className="flex justify-between"><span>상품 금액 합계</span><span>{formatPrice(previewSubtotal)}</span></p>
                <p className="mt-2 flex justify-between"><span>예상 할인</span><strong>-{formatPrice(previewTotal)}</strong></p>
                {allocated.some((option) => option.amount > 0) ? (
                  <ul className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-muted">
                    {allocated.filter((option) => option.amount > 0).map((option) => (
                      <li key={option.code} className="flex justify-between gap-4">
                        <span>{option.summary ?? option.label}</span>
                        <span className="shrink-0">-{formatPrice(option.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 flex justify-between"><span>배송비</span><span>{formatPrice(shippingFee(previewSubtotal - previewTotal))}</span></p>
                <p className="mt-2 flex justify-between text-base"><span className="font-bold">예상 결제금액</span><span className="font-bold" style={{ color: "#e10600" }}>{formatPrice(previewSubtotal - previewTotal + shippingFee(previewSubtotal - previewTotal))}</span></p>
              </div>
              <DownloadableCoupons coupons={downloads} />
              {error ? <p className="mt-3 text-sm text-accent" role="alert">{error}</p> : null}
              {selectionError ? <p className="mt-3 text-sm text-accent" role="alert">{selectionError}</p> : null}
            </div>
            <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button>
              <button type="button" className="btn" disabled={pending || !!selectionError} onClick={() => startTransition(async () => { setError(""); try { await onApply(preview ?? { code: "", label: "쿠폰 미적용", discount: 0, eligible: true, isStackable: false }); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "쿠폰을 변경하지 못했습니다."); } })}>{pending ? "적용 중…" : "적용하기"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CartCoupon({ options, selected, subtotal }: { options: CouponOption[]; selected: string; subtotal: number }) {
  const router = useRouter();
  return <CouponPicker options={options} selected={selected} subtotal={subtotal} onApply={async (option) => { const result = await selectCartCoupon(option.code || "-"); if ("error" in result && result.error) throw new Error(result.error); router.refresh(); }} />;
}
