"use client";

import { useState, useTransition } from "react";
import { createCoupon, deleteCoupon, issueCoupon, toggleCouponPause, updateCoupon } from "@/actions/promotions";
import { DisabledText } from "@/components/disabled-text";
import { formatPrice } from "@/lib/utils";

type CouponView = {
  id: string;
  code: string;
  name: string;
  scope: string;
  includedProductIds: string;
  excludedProductIds: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  minQuantity: number;
  maxUses: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  isPaused: boolean;
  createdAt: string;
  issues: { id: string; targetType: string; userId: string | null; categoryId: string | null; createdAt: string }[];
};

type ProductOption = { id: string; name: string };
type IssueTarget = { id: string; label: string };

function localInput(value: string | Date) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function parseIds(value?: string) {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="admin-row">
      <label htmlFor={htmlFor}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function ProductSearchSelector({ products, name, selected: initialSelected, idPrefix }: { products: ProductOption[]; name: string; selected: string[]; idPrefix: string }) {
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
              <button key={id} type="button" className="border border-line bg-white px-3 py-2 text-left text-xs" onClick={() => toggleProduct(id)} title="선택 해제">
                {product?.name ?? "삭제된 상품"} <span className="text-muted">({id})</span> ×
              </button>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/40 px-5 py-10" role="presentation">
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
              <p className="mt-2 text-xs text-muted">검색어를 입력하지 않고 검색하면 전체 상품이 표시됩니다.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {query === null ? (
                <p className="py-10 text-center text-sm text-muted">상품ID 또는 상품명으로 검색해 주세요.</p>
              ) : results.length ? (
                <>
                  <label className="flex items-center gap-2 border-b border-line bg-[#f9fafb] px-3 py-3 text-sm font-bold">
                    <input type="checkbox" checked={allResultsSelected} onChange={toggleAllResults} /> 전체 선택 ({results.length}개)
                  </label>
                  <div className="divide-y divide-line">
                    {results.map((product) => (
                      <label key={product.id} className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 px-3 py-3 text-sm hover:bg-[#f9fafb]">
                        <input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggleProduct(product.id)} />
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
      ) : null}
    </div>
  );
}

function CouponFields({ prefix, products, coupon }: { prefix: string; products: ProductOption[]; coupon?: CouponView }) {
  const [scope, setScope] = useState(coupon?.scope ?? "CART");
  const included = parseIds(coupon?.includedProductIds);
  const excluded = parseIds(coupon?.excludedProductIds);
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const isProductCoupon = scope === "PRODUCT" || scope === "ONE_PLUS_ONE";

  return (
    <div className="grid gap-4">
      {coupon ? (
        <Field label="쿠폰 코드">
          <DisabledText>{coupon.code}</DisabledText>
        </Field>
      ) : (
        <p className="rounded-sm bg-[#f9fafb] px-4 py-3 text-sm text-muted">쿠폰 코드는 등록 시 자동으로 고유 생성됩니다.</p>
      )}
      <Field label="쿠폰명" htmlFor={`${prefix}-name`}>
        {scope === "MULTI_CART" ? (
          <><input type="hidden" name="name" value="가지가지할인" /><DisabledText>가지가지할인</DisabledText></>
        ) : (
          <input id={`${prefix}-name`} className="field" name="name" defaultValue={coupon?.name} required />
        )}
      </Field>
      <Field label="쿠폰 유형">
        <input type="hidden" name="scope" value={scope} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`flex min-h-14 cursor-pointer items-center gap-3 border px-4 ${isProductCoupon ? "border-ink bg-[#f3f4f6]" : "border-line bg-white"}`}>
            <input type="checkbox" checked={isProductCoupon} onChange={() => setScope("PRODUCT")} /> 상품 쿠폰
          </label>
          <label className={`flex min-h-14 cursor-pointer items-center gap-3 border px-4 ${!isProductCoupon ? "border-ink bg-[#f3f4f6]" : "border-line bg-white"}`}>
            <input type="checkbox" checked={!isProductCoupon} onChange={() => setScope("CART")} /> 장바구니 쿠폰
          </label>
        </div>
        {!isProductCoupon ? (
          <label className="mt-3 flex min-h-12 items-center gap-3 border border-line bg-[#f9fafb] px-4 text-sm">
            <input type="checkbox" checked={scope === "MULTI_CART"} onChange={(event) => setScope(event.target.checked ? "MULTI_CART" : "CART")} /> 가지가지할인으로 적용
          </label>
        ) : (
          <label className="mt-3 flex min-h-12 items-center gap-3 border border-line bg-[#f9fafb] px-4 text-sm">
            <input type="checkbox" checked={scope === "ONE_PLUS_ONE"} onChange={(event) => setScope(event.target.checked ? "ONE_PLUS_ONE" : "PRODUCT")} /> 1+1 할인으로 적용
          </label>
        )}
        <p className="mt-2 text-xs text-muted">
          {scope === "CART"
            ? "장바구니에 상품이 있으면 수량과 관계없이 적용됩니다."
            : scope === "MULTI_CART"
              ? "서로 다른 상품이 2종 이상 담긴 장바구니에 추가 할인이 적용됩니다."
              : scope === "ONE_PLUS_ONE"
                ? "선택한 동일 상품을 2개 이상 구매하면 2개마다 1개 가격이 할인됩니다."
                : "선택한 상품의 금액에만 할인이 적용됩니다."}
        </p>
      </Field>
      <Field label="적용 상품">
        <ProductSearchSelector products={products} name="includedProductIds" selected={included} idPrefix={prefix} />
        <p className="mt-2 text-xs text-muted">상품 쿠폰은 적용 상품을 1개 이상 선택해야 합니다. 장바구니 쿠폰은 미선택 시 전체 상품에 적용됩니다.</p>
      </Field>
      <Field label="제외 상품">
        <ProductSearchSelector products={products} name="excludedProductIds" selected={excluded} idPrefix={prefix} />
        <p className="mt-2 text-xs text-muted">적용 상품과 제외 상품에 함께 선택된 상품은 제외 상품으로 처리됩니다.</p>
      </Field>
      <Field label="할인 방식" htmlFor={`${prefix}-discountType`}>
        {scope === "ONE_PLUS_ONE" ? <><input type="hidden" name="discountType" value="AMOUNT" /><DisabledText>1+1 자동 할인</DisabledText></> : <select id={`${prefix}-discountType`} className="field" name="discountType" defaultValue={coupon?.discountType ?? "PERCENT"}>
          <option value="PERCENT">정률 할인 (%)</option>
          <option value="AMOUNT">정액 할인 (원)</option>
        </select>}
      </Field>
      <Field label="할인값" htmlFor={`${prefix}-discountValue`}>
        {scope === "ONE_PLUS_ONE" ? <><input type="hidden" name="discountValue" value="0" /><DisabledText>동일 상품 2개당 1개 가격</DisabledText></> : <input id={`${prefix}-discountValue`} className="field" name="discountValue" type="number" min={1} defaultValue={coupon?.discountValue} required />}
      </Field>
      <Field label="최소 주문금액" htmlFor={`${prefix}-minOrderAmount`}>
        <input id={`${prefix}-minOrderAmount`} className="field" name="minOrderAmount" type="number" min={0} defaultValue={coupon?.minOrderAmount ?? 0} />
      </Field>
      <Field label="최소 적용수량" htmlFor={`${prefix}-minQuantity`}>
        {scope === "CART" ? (
          <><input type="hidden" name="minQuantity" value="0" /><DisabledText>수량 제한 없음</DisabledText></>
        ) : scope === "MULTI_CART" ? (
          <><input type="hidden" name="minQuantity" value="2" /><DisabledText>서로 다른 상품 2종 이상</DisabledText></>
        ) : scope === "ONE_PLUS_ONE" ? (
          <><input type="hidden" name="minQuantity" value="2" /><DisabledText>동일 상품 2개 이상</DisabledText></>
        ) : (
          <input id={`${prefix}-minQuantity`} className="field" name="minQuantity" type="number" min={0} step={1} defaultValue={coupon?.minQuantity ?? 0} />
        )}
      </Field>
      <Field label="최대 사용횟수" htmlFor={`${prefix}-maxUses`}>
        <input id={`${prefix}-maxUses`} className="field" name="maxUses" type="number" min={0} defaultValue={coupon?.maxUses ?? 0} />
      </Field>
      <Field label="사용 시작일" htmlFor={`${prefix}-startAt`}>
        <input id={`${prefix}-startAt`} className="field" name="startAt" type="datetime-local" defaultValue={localInput(coupon?.startAt ?? start)} required />
      </Field>
      <Field label="사용 종료일" htmlFor={`${prefix}-endAt`}>
        <input id={`${prefix}-endAt`} className="field" name="endAt" type="datetime-local" defaultValue={localInput(coupon?.endAt ?? end)} required />
      </Field>
      <Field label="사용 여부" htmlFor={`${prefix}-isActive`}>
        <label className="flex min-h-[3.2rem] items-center gap-2 text-sm">
          <input id={`${prefix}-isActive`} name="isActive" type="checkbox" defaultChecked={coupon?.isActive ?? true} />
          사용 가능{coupon ? ` · 현재 ${coupon.usedCount}회 사용` : ""}
        </label>
      </Field>
    </div>
  );
}

function CouponIssueModal({ coupon, targets }: { coupon: CouponView; targets: { users: IssueTarget[]; categories: IssueTarget[] } }) {
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState<"USER" | "CATEGORY">("USER");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const options = targetType === "USER" ? targets.users : targets.categories;
  const results = query === null ? [] : options.filter((option) => {
    const keyword = query.toLocaleLowerCase();
    return !keyword || option.id.toLocaleLowerCase().includes(keyword) || option.label.toLocaleLowerCase().includes(keyword);
  });
  const allSelected = results.length > 0 && results.every((option) => selected.includes(option.id));

  function changeTargetType(next: "USER" | "CATEGORY") {
    setTargetType(next);
    setSearchText("");
    setQuery(null);
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelected((current) => allSelected
      ? current.filter((id) => !results.some((option) => option.id === id))
      : [...new Set([...current, ...results.map((option) => option.id)])]);
  }

  function submitIssue() {
    if (!selected.length) { setError("발행 대상을 1개 이상 선택해 주세요."); return; }
    const formData = new FormData();
    formData.set("couponId", coupon.id);
    formData.set("targetType", targetType);
    selected.forEach((id) => formData.append("targetIds", id));
    startTransition(async () => {
      setError("");
      try {
        await issueCoupon(formData);
        setOpen(false);
      } catch {
        setError("일시중지되었거나 사용할 수 없는 쿠폰은 발행할 수 없습니다.");
      }
    });
  }

  return (
    <>
      <button type="button" className="btn" disabled={coupon.isPaused || !coupon.isActive} onClick={() => { setError(""); setOpen(true); }}>쿠폰 발행</button>
      {open ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/45 px-5 py-10" role="presentation">
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="쿠폰 발행">
            <div className="flex items-center justify-between border-b border-line px-6 py-5"><div><h3 className="text-lg font-semibold">쿠폰 발행</h3><p className="mt-1 text-xs text-muted">{coupon.name} · 발행 완료 {coupon.issues.length}건</p></div><button type="button" className="text-2xl text-muted" aria-label="쿠폰 발행 닫기" onClick={() => setOpen(false)}>×</button></div>
            <div className="border-b border-line p-6">
              <p className="mb-2 text-sm font-medium">발행 대상</p>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${targetType === "USER" ? "border-slate-700 bg-slate-100" : "border-line"}`}><input type="checkbox" checked={targetType === "USER"} onChange={() => changeTargetType("USER")} /> 특정 회원 ID</label>
                <label className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${targetType === "CATEGORY" ? "border-slate-700 bg-slate-100" : "border-line"}`}><input type="checkbox" checked={targetType === "CATEGORY"} onChange={() => changeTargetType("CATEGORY")} /> 상품 카테고리</label>
              </div>
              <label className="mt-5 block text-sm font-medium" htmlFor={`issue-search-${coupon.id}`}>{targetType === "USER" ? "회원 ID" : "카테고리 ID 또는 카테고리명"}</label>
              <div className="mt-2 flex gap-2"><input id={`issue-search-${coupon.id}`} className="field" value={searchText} onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setQuery(searchText.trim()); } }} /><button type="button" className="btn" onClick={() => setQuery(searchText.trim())}>검색</button></div>
              <p className="mt-2 text-xs text-muted">검색어 없이 검색하면 전체 대상이 표시됩니다.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {query === null ? <p className="py-10 text-center text-sm text-muted">대상을 검색해 주세요.</p> : results.length ? <><label className="flex items-center gap-2 border-b border-line bg-slate-50 px-3 py-3 text-sm font-semibold"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> 검색 결과 전체 선택 ({results.length}개)</label><div className="divide-y divide-line">{results.map((option) => <label key={option.id} className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 px-3 py-3 text-sm hover:bg-slate-50"><input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} /><span>{option.label}<span className="mt-1 block break-all text-xs text-muted">{option.id}</span></span></label>)}</div></> : <p className="py-10 text-center text-sm text-muted">검색 결과가 없습니다.</p>}
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-6 py-4"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button><button type="button" className="btn" disabled={pending} onClick={submitIssue}>{pending ? "발행 중…" : `선택 대상 ${selected.length}건 발행`}</button></div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function discountLabel(coupon: CouponView) {
  if (coupon.scope === "ONE_PLUS_ONE") return "1+1";
  return coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short" }).format(new Date(value));
}

const PAGE_SIZE = 5;

export function CouponAdmin({ coupons, products, issueTargets }: { coupons: CouponView[]; products: ProductOption[]; issueTargets: { users: IssueTarget[]; categories: IssueTarget[] } }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const pageCount = Math.ceil(coupons.length / PAGE_SIZE);
  const pageCoupons = coupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = coupons.find((coupon) => coupon.id === selectedId);

  function movePage(nextPage: number) {
    setPage(nextPage);
    setSelectedId("");
  }

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      setError("");
      try {
        await createCoupon(formData);
        setOpen(false);
      } catch {
        setError("쿠폰 유형, 적용 상품, 할인 조건과 사용 기간을 확인해 주세요.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">쿠폰관리</h1>
          <p className="mt-2 text-sm text-muted">쿠폰을 선택하면 목록 하단에서 상세 내용을 확인하고 수정할 수 있습니다.</p>
        </div>
        <button type="button" className="btn shrink-0" onClick={() => { setError(""); setOpen(true); }}>쿠폰등록</button>
      </div>

      {coupons.length ? (
        <>
          <h2 className="mt-8 text-base font-semibold">쿠폰 목록</h2>
          <div className="mt-4 overflow-x-auto border border-line" role="tablist" aria-label="등록 쿠폰">
            <div className="grid min-w-[820px] grid-cols-[1.2fr_1.5fr_0.8fr_0.7fr_1.2fr_0.7fr] gap-3 bg-slate-50 px-3 py-2 text-[0.68rem] font-semibold text-muted">
              <span>쿠폰 코드</span><span>쿠폰명</span><span>쿠폰 유형</span><span>할인</span><span>사용 기간</span><span>상태</span>
            </div>
            {pageCoupons.map((coupon) => {
              const active = selected?.id === coupon.id;
              return (
                <button key={coupon.id} type="button" role="tab" aria-selected={active} aria-controls="coupon-detail-panel" className={`grid w-full min-w-[820px] grid-cols-[1.2fr_1.5fr_0.8fr_0.7fr_1.2fr_0.7fr] gap-3 border-t border-line px-3 py-2.5 text-left text-[0.72rem] transition ${active ? "bg-slate-100" : "bg-white hover:bg-slate-50"}`} onClick={() => setSelectedId(coupon.id)}>
                  <span className="font-mono text-[0.68rem]">{coupon.code}</span>
                  <span className="font-bold">{coupon.name}</span>
                  <span>{coupon.scope === "ONE_PLUS_ONE" ? "1+1 할인" : coupon.scope === "PRODUCT" ? "상품" : coupon.scope === "MULTI_CART" ? "가지가지할인" : "장바구니"}</span>
                  <span>{discountLabel(coupon)}</span>
                  <span className="text-[0.68rem] text-muted">{dateLabel(coupon.startAt)} ~ {dateLabel(coupon.endAt)}</span>
                  <span className={coupon.isPaused ? "text-muted" : coupon.isActive ? "text-accent" : "text-muted"}>{coupon.isPaused ? "일시중지" : coupon.isActive ? "사용 가능" : "사용 중지"}</span>
                </button>
              );
            })}
          </div>

          <nav className="mt-5 flex justify-center gap-2" aria-label="쿠폰 목록 페이지">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" className={`h-9 min-w-9 border px-3 text-sm ${page === number ? "border-ink bg-ink text-white" : "border-line bg-white"}`} aria-current={page === number ? "page" : undefined} onClick={() => movePage(number)}>{number}</button>
              ))}
          </nav>

          {selected ? (
            <section id="coupon-detail-panel" role="tabpanel" className="mt-8 border border-line bg-white p-6 md:p-8">
              <div className="mb-7 border-b border-line pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">쿠폰 상세</h2><p className="mt-1 text-xs text-muted">{selected.name} · 발행 {selected.issues.length}건</p></div><CouponIssueModal coupon={selected} targets={issueTargets} /></div>
                {selected.isPaused ? <p className="mt-3 bg-[#f3f4f6] px-4 py-3 text-sm text-muted">일시중지된 쿠폰으로 발행 및 사용이 불가능합니다.</p> : null}
              </div>
              <form key={selected.id} action={updateCoupon} className="grid max-w-3xl gap-6">
                <input type="hidden" name="id" value={selected.id} />
                <CouponFields prefix={`edit-${selected.id}`} products={products} coupon={selected} />
                <div className="admin-row">
                  <span />
                  <div className="flex gap-3">
                    <button className="btn">쿠폰 수정</button>
                    <button className="btn btn-ghost" formAction={toggleCouponPause}>{selected.isPaused ? "쿠폰 재개" : "쿠폰 일시중지"}</button>
                    <button className="btn btn-ghost" formAction={deleteCoupon}>쿠폰 삭제</button>
                  </div>
                </div>
              </form>
            </section>
          ) : null}
        </>
      ) : (
        <div><h2 className="mt-8 text-base font-semibold">쿠폰 목록</h2><div className="mt-4 border border-dashed border-line bg-slate-50 px-6 py-16 text-center text-sm text-muted">등록된 쿠폰이 없습니다. 쿠폰등록 버튼으로 첫 쿠폰을 만들어 보세요.</div></div>
      )}

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/45 px-5 py-10" role="presentation">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="coupon-create-title">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 id="coupon-create-title" className="text-lg font-semibold">쿠폰 등록</h2>
              <button type="button" className="text-2xl leading-none text-muted" aria-label="쿠폰 등록 닫기" onClick={() => setOpen(false)}>×</button>
            </div>
            <form action={submitCreate} className="max-h-[75vh] overflow-y-auto p-6 md:p-8">
              <CouponFields prefix="create" products={products} />
              {error ? <p className="mt-5 text-sm text-accent" role="alert">{error}</p> : null}
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>취소</button>
                <button className="btn" disabled={pending}>{pending ? "등록 중…" : "쿠폰 등록"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
