import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isDisplayPage, loadPageDisplay } from "@/lib/display";
import { assignDisplayContent, createDisplayShortcut, removeDisplayItem, saveDisplayItems } from "@/actions/display";
import { DISPLAY_PAGES, SHORTCUT_ICONS, SHORTCUT_ICON_LABEL, shortcutIcon, type AssignArea } from "@/lib/display-items";
import { AdminCreateModal } from "@/components/admin-create-modal";
import { RequiredMark } from "@/components/required-mark";
import { ProductSearchPicker, type SearchableProduct } from "@/components/product-search-picker";
import { SortableTable } from "@/components/admin-list-controls";

const PAGE_COPY: Record<(typeof DISPLAY_PAGES)[number]["key"], string> = {
  home: "",
  products: "전체상품 필터 영역에 올릴 카테고리를 추가합니다.",
  best: "베스트 영역에 올릴 상품을 추가하고 순위를 정합니다.",
  events: "이벤트 영역에 올릴 기획전을 추가합니다. 비공개 기획전은 여기서 추가해도 스토어에 나오지 않습니다.",
};

type DisplayRow = Awaited<ReturnType<typeof loadPageDisplay>>[number];
type Option = { id: string; label: string };

function ExposureCheckbox({ id, checked }: { id: string; checked: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <input type="checkbox" name={`visible:${id}`} defaultChecked={checked} />
      영역 노출
    </label>
  );
}

function SortField({ id, value }: { id: string; value: number }) {
  return (
    <div className="w-24">
      <input className="field" type="number" name={`sort:${id}`} defaultValue={value} />
    </div>
  );
}

function IconField({ id, value }: { id: string; value: string }) {
  return (
    <div className="w-36">
      <select className="field" name={`icon:${id}`} defaultValue={shortcutIcon(value)}>
        {SHORTCUT_ICONS.map((icon) => (
          <option key={icon} value={icon}>
            {SHORTCUT_ICON_LABEL[icon]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ProductAssignButton({ title, area, products }: { title: string; area: AssignArea; products: SearchableProduct[] }) {
  if (products.length === 0) return <p className="text-sm text-muted">추가할 항목이 없습니다.</p>;
  return (
    <AdminCreateModal title={title} triggerLabel={title} action={assignDisplayContent} wide>
      <input type="hidden" name="area" value={area} />
      <ProductSearchPicker products={products} name="refId" selected={[]} idPrefix={`${area}-products`} />
    </AdminCreateModal>
  );
}

function AssignButton({ title, area, options }: { title: string; area: AssignArea; options: Option[] }) {
  if (options.length === 0) return <p className="text-sm text-muted">추가할 항목이 없습니다.</p>;
  return (
    <AdminCreateModal title={title} triggerLabel={title} action={assignDisplayContent} wide>
      <input type="hidden" name="area" value={area} />
      <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-line p-4 md:grid-cols-2">
        {options.map((option) => (
          <label key={option.id} className="text-sm">
            <input type="checkbox" name="refId" value={option.id} /> {option.label}
          </label>
        ))}
      </div>
    </AdminCreateModal>
  );
}

function RemoveButton({ id }: { id: string }) {
  return (
    <button className="btn btn-ghost" type="submit" form={`remove-display-${id}`}>
      제외
    </button>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-muted">
        이 영역에 등록된 컨텐츠가 없습니다.
      </td>
    </tr>
  );
}

export default async function DisplayAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = (await searchParams).page ?? "home";
  const pageKey = isDisplayPage(requested) ? requested : "home";
  const [items, categories, products, exhibitions] = await Promise.all([
    loadPageDisplay(pageKey),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ include: { category: true }, orderBy: { name: "asc" } }),
    prisma.exhibition.findMany({ orderBy: { startAt: "desc" } }),
  ]);

  const visibleItems = items.filter((item) => item.kind !== "meta" && item.kind !== "section" && item.isVisible);
  const sections = items.filter((item) => item.kind === "section").sort((left, right) => left.sortOrder - right.sortOrder);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const exhibitionById = new Map(exhibitions.map((exhibition) => [exhibition.id, exhibition]));
  const taken = (rows: DisplayRow[]) => new Set(rows.map((item) => item.refId));

  const quickItems = visibleItems.filter((item) => item.kind === "shortcut");
  const homeTimesale = visibleItems.filter((item) => item.slotKey.startsWith("timesale-product:"));
  const homePromotion = visibleItems.filter((item) => item.slotKey.startsWith("promotion-product:"));
  const productFilters = visibleItems.filter((item) => item.kind === "category");
  const bestProducts = visibleItems.filter((item) => item.kind === "product");
  const eventItems = visibleItems.filter((item) => item.kind === "exhibition");

  const categoryOptions = categories
    .filter((category) => category.isVisible)
    .filter((category) => !taken(pageKey === "home" ? quickItems : productFilters).has(category.id))
    .map((category) => ({ id: category.id, label: category.name }));
  const productOptions = (assigned: DisplayRow[]) =>
    products
      .filter((product) => !taken(assigned).has(product.id))
      .map((product) => ({ id: product.id, name: `${product.name} · ${product.category.name}`, imageUrl: product.imageUrl }));
  const exhibitionOptions = exhibitions
    .filter((exhibition) => !taken(eventItems).has(exhibition.id))
    .map((exhibition) => ({ id: exhibition.id, label: exhibition.title }));

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">전시관리</h1>
          {PAGE_COPY[pageKey] ? <p className="mt-2 max-w-3xl text-sm text-muted">{PAGE_COPY[pageKey]}</p> : null}
        </div>
        <button className="btn" type="submit" form="display-form">
          저장
        </button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="전시 페이지">
        {DISPLAY_PAGES.map((item) => {
          const active = item.key === pageKey;
          return (
            <Link
              key={item.key}
              href={`/admin/display?page=${item.key}`}
              className={`display-tab inline-flex h-9 items-center rounded-md border px-4 text-sm ${
                active ? "border-slate-700 bg-slate-700" : "border-line bg-white text-slate-700"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form id="display-form" action={saveDisplayItems} className="mt-8 grid gap-8">
        <input type="hidden" name="pageKey" value={pageKey} />

        {pageKey === "home"
          ? sections.map((section) => {
              if (section.slotKey === "section:quick") {
                return (
                  <section key={section.id} className="rounded-lg border border-line bg-white p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold">퀵메뉴</h2>
                        <p className="mt-1 text-sm text-muted">홈 원형 메뉴에 올릴 항목입니다.</p>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="id" value={section.id} />
                        <ExposureCheckbox id={section.id} checked={section.isVisible} />
                        <label className="text-sm">
                          영역 순서
                          <SortField id={section.id} value={section.sortOrder} />
                        </label>
                        <AssignButton title="카테고리 추가" area="quick-category" options={categoryOptions} />
                        <AdminCreateModal title="퀵메뉴 직접 추가" triggerLabel="직접 추가" action={createDisplayShortcut}>
                          <label className="text-sm font-medium">
                            이름<RequiredMark />
                            <input className="field mt-2" name="label" required maxLength={40} />
                          </label>
                          <label className="text-sm font-medium">
                            링크<RequiredMark />
                            <input className="field mt-2" name="href" defaultValue="/" required />
                          </label>
                          <label className="text-sm font-medium">
                            아이콘
                            <select className="field mt-2" name="icon" defaultValue="object">
                              {SHORTCUT_ICONS.map((icon) => (
                                <option key={icon} value={icon}>
                                  {SHORTCUT_ICON_LABEL[icon]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </AdminCreateModal>
                      </div>
                    </div>
                    <SortableTable columns={[{ label: "항목" }, { label: "구분" }, { label: "아이콘" }, { label: "링크" }, { label: "정렬", sortKey: "order" }, { label: "" }]}>
                          {quickItems.length === 0 ? (
                            <EmptyRow colSpan={6} />
                          ) : (
                            quickItems.map((item) => (
                              <tr key={item.id} data-sort-order={item.sortOrder} data-row-id={item.id} className="border-t border-line">
                                <td>
                                  <input type="hidden" name="id" value={item.id} />
                                  {item.refId ? (
                                    <span>
                                      {item.label}
                                      {categoryById.get(item.refId)?.isVisible === false ? (
                                        <span className="ml-2 text-xs text-muted">카테고리 숨김</span>
                                      ) : null}
                                    </span>
                                  ) : (
                                    <input className="field" name={`label:${item.id}`} defaultValue={item.label} maxLength={40} />
                                  )}
                                </td>
                                <td>{item.refId ? "카테고리" : "직접 추가"}</td>
                                <td>
                                  <IconField id={item.id} value={item.icon} />
                                </td>
                                <td>
                                  {item.refId ? (
                                    <span className="text-muted">{item.href}</span>
                                  ) : (
                                    <input className="field" name={`href:${item.id}`} defaultValue={item.href} />
                                  )}
                                </td>
                                <td>
                                  <SortField id={item.id} value={item.sortOrder} />
                                </td>
                                <td>
                                  <RemoveButton id={item.id} />
                                </td>
                              </tr>
                            ))
                          )}
                    </SortableTable>
                  </section>
                );
              }

              if (section.slotKey === "section:best") {
                return (
                  <section key={section.id} className="rounded-lg border border-line bg-white p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div className="min-w-64 flex-1">
                        <h2 className="text-base font-semibold">Today&apos;s Pick!</h2>
                        <p className="mt-1 text-sm text-muted">판매 중인 등록 상품 전체에서 매일 00:00:01(한국시간)에 4개를 다시 뽑습니다. 그날은 같은 상품이 유지됩니다.</p>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="id" value={section.id} />
                        <ExposureCheckbox id={section.id} checked={section.isVisible} />
                        <label className="text-sm">
                          영역 순서
                          <SortField id={section.id} value={section.sortOrder} />
                        </label>
                      </div>
                    </div>
                  </section>
                );
              }

              if (section.slotKey === "section:promotion" || section.slotKey === "section:timesale") {
                const assigned = section.slotKey === "section:promotion" ? homePromotion : homeTimesale;
                const area: AssignArea = section.slotKey === "section:promotion" ? "home-promotion" : "home-timesale";
                const heading = section.slotKey === "section:promotion" ? "Promotion" : "타임세일";
                return (
                  <section key={section.id} className="rounded-lg border border-line bg-white p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div className="min-w-64 flex-1">
                        <h2 className="text-base font-semibold">{heading}</h2>
                        <label className="mt-3 block text-sm font-medium">
                          영역 제목
                          <input className="field mt-2" name={`label:${section.id}`} defaultValue={section.label} maxLength={40} />
                        </label>
                        {section.slotKey === "section:timesale" ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm font-medium">
                              종료 시각
                              <input className="field mt-2" type="datetime-local" name={`href:${section.id}`} defaultValue={section.href} />
                            </label>
                            <label className="block text-sm font-medium">
                              타임세일 할인율
                              <input className="field mt-2" type="number" name={`rate:${section.id}`} min={0} max={100} defaultValue={Number(section.icon) || 0} />
                            </label>
                          </div>
                        ) : null}
                        {section.slotKey === "section:timesale" ? <p className="mt-2 text-xs text-muted">메인에서는 상품 3개씩 넘겨 보여 줍니다.</p> : null}
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="id" value={section.id} />
                        <ExposureCheckbox id={section.id} checked={section.isVisible} />
                        <label className="text-sm">
                          영역 순서
                          <SortField id={section.id} value={section.sortOrder} />
                        </label>
                        <ProductAssignButton title="제품 추가" area={area} products={productOptions(assigned)} />
                      </div>
                    </div>
                    <ProductRows products={assigned} productById={productById} />
                  </section>
                );
              }

              const linked = section.slotKey === "section:hero" || section.slotKey === "section:coupon";
              return (
                <section key={section.id} className="rounded-lg border border-line bg-white p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold">{section.slotKey === "section:hero" ? "메인 배너" : "쿠폰 배너"}</h2>
                      <p className="mt-1 text-sm text-muted">이 영역의 노출과 연결 링크를 설정합니다.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={section.id} />
                      <ExposureCheckbox id={section.id} checked={section.isVisible} />
                      {linked ? (
                        <label className="text-sm">
                          연결 링크
                          <input className="field mt-2" name={`href:${section.id}`} defaultValue={section.href} />
                        </label>
                      ) : null}
                      <label className="text-sm">
                        영역 순서
                        <SortField id={section.id} value={section.sortOrder} />
                      </label>
                    </div>
                  </div>
                </section>
              );
            })
          : null}

        {pageKey === "products" ? (
          <section className="rounded-lg border border-line bg-white p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">카테고리 필터</h2>
                <p className="mt-1 text-sm text-muted">전체상품 상단에 올릴 카테고리입니다.</p>
              </div>
              <AssignButton title="카테고리 추가" area="products" options={categoryOptions} />
            </div>
            <SortableTable columns={[{ label: "카테고리" }, { label: "정렬", sortKey: "order" }, { label: "" }]}>
                  {productFilters.length === 0 ? (
                    <EmptyRow colSpan={3} />
                  ) : (
                    productFilters.map((item) => (
                      <tr key={item.id} data-sort-order={item.sortOrder} data-row-id={item.id} className="border-t border-line">
                        <td>
                          <input type="hidden" name="id" value={item.id} />
                          {item.label}
                          {categoryById.get(item.refId)?.isVisible === false ? (
                            <span className="ml-2 text-xs text-muted">카테고리 숨김</span>
                          ) : null}
                        </td>
                        <td>
                          <SortField id={item.id} value={item.sortOrder} />
                        </td>
                        <td>
                          <RemoveButton id={item.id} />
                        </td>
                      </tr>
                    ))
                  )}
            </SortableTable>
          </section>
        ) : null}

        {pageKey === "best" ? (
          <section className="rounded-lg border border-line bg-white p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">베스트 상품</h2>
                <p className="mt-1 text-sm text-muted">베스트 페이지에 올릴 상품입니다.</p>
              </div>
              <ProductAssignButton title="제품 추가" area="best" products={productOptions(bestProducts)} />
            </div>
            <ProductRows products={bestProducts} productById={productById} showRank />
          </section>
        ) : null}

        {pageKey === "events" ? (
          <section className="rounded-lg border border-line bg-white p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">기획전</h2>
                <p className="mt-1 text-sm text-muted">이벤트 페이지에 올릴 기획전입니다.</p>
              </div>
              <AssignButton title="기획전 추가" area="events" options={exhibitionOptions} />
            </div>
            <SortableTable columns={[{ label: "기획전" }, { label: "상태" }, { label: "정렬", sortKey: "order" }, { label: "" }]}>
                  {eventItems.length === 0 ? (
                    <EmptyRow colSpan={4} />
                  ) : (
                    eventItems.map((item) => (
                      <tr key={item.id} data-sort-order={item.sortOrder} data-row-id={item.id} className="border-t border-line">
                        <td>
                          <input type="hidden" name="id" value={item.id} />
                          {item.label}
                        </td>
                        <td>{exhibitionById.get(item.refId)?.isActive === false ? "비공개" : "공개"}</td>
                        <td>
                          <SortField id={item.id} value={item.sortOrder} />
                        </td>
                        <td>
                          <RemoveButton id={item.id} />
                        </td>
                      </tr>
                    ))
                  )}
            </SortableTable>
          </section>
        ) : null}

        <div className="flex justify-end">
          <button className="btn" type="submit">
            저장
          </button>
        </div>
      </form>

      {visibleItems.map((item) => (
        <form key={item.id} id={`remove-display-${item.id}`} action={removeDisplayItem}>
          <input type="hidden" name="id" value={item.id} />
        </form>
      ))}
    </div>
  );
}

function ProductRows({
  products,
  productById,
  showSort = true,
  showRank = false,
}: {
  products: DisplayRow[];
  productById: Map<string, { isPublished: boolean; category: { name: string } }>;
  showSort?: boolean;
  showRank?: boolean;
}) {
  const ranked = [...products].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
  const columns = [
    ...(showRank ? [{ label: "순위", sortKey: "order" }] : []),
    { label: "상품" },
    { label: "카테고리" },
    { label: "상태" },
    ...(showSort && !showRank ? [{ label: "정렬", sortKey: "order" }] : []),
    { label: "" },
  ];
  return (
    <SortableTable columns={columns}>
          {ranked.length === 0 ? (
            <EmptyRow colSpan={columns.length} />
          ) : (
            ranked.map((item) => {
              const product = productById.get(item.refId);
              return (
                <tr key={item.id} data-sort-order={item.sortOrder} data-row-id={item.id} className="border-t border-line">
                  {showRank ? (
                    <td>
                      <SortField id={item.id} value={item.sortOrder} />
                    </td>
                  ) : null}
                  <td className="product-name">
                    <input type="hidden" name="id" value={item.id} />
                    {item.label}
                  </td>
                  <td>{product?.category.name ?? "—"}</td>
                  <td>{product?.isPublished === false ? "비공개" : "공개"}</td>
                  {showSort && !showRank ? (
                    <td>
                      <SortField id={item.id} value={item.sortOrder} />
                    </td>
                  ) : null}
                  <td>
                    <RemoveButton id={item.id} />
                  </td>
                </tr>
              );
            })
          )}
    </SortableTable>
  );
}
