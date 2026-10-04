import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadPageDisplay, isDisplayPage } from "@/lib/display";
import { createDisplayShortcut, deleteDisplayShortcut, saveDisplayItems } from "@/actions/display";
import { DISPLAY_PAGES, SHORTCUT_ICONS, SHORTCUT_ICON_LABEL, shortcutIcon } from "@/lib/display-items";
import { AdminCreateModal } from "@/components/admin-create-modal";

const PAGE_COPY: Record<(typeof DISPLAY_PAGES)[number]["key"], string> = {
  home: "홈의 원형 메뉴와 배너, 상품 섹션을 조절합니다. 카테고리 이름과 주소는 카테고리 관리를 따르고, Best Selling 상품은 상품 관리의 메인 노출을 따릅니다.",
  products: "전체상품 상단 카테고리 필터의 노출과 순서를 조절합니다. 카테고리 관리에서 숨긴 항목은 여기서 켜도 스토어에 나오지 않습니다.",
  best: "베스트에 올릴 상품을 고릅니다. 공개 상품만 스토어에 나오고, 순서는 판매량 기준입니다.",
  events: "이벤트 페이지에 올릴 기획전과 순서를 조절합니다. 기획전이 비공개면 여기서 켜도 스토어에 나오지 않습니다.",
};

function ExposureCheckbox({ id, checked }: { id: string; checked: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <input type="checkbox" name={`visible:${id}`} defaultChecked={checked} />
      노출
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

export default async function DisplayAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = (await searchParams).page ?? "home";
  const pageKey = isDisplayPage(requested) ? requested : "home";
  const [items, categories, products, exhibitions] = await Promise.all([
    loadPageDisplay(pageKey),
    prisma.category.findMany({ select: { id: true, isVisible: true } }),
    pageKey === "best"
      ? prisma.product.findMany({ select: { id: true, isPublished: true, category: { select: { name: true } } } })
      : Promise.resolve([]),
    pageKey === "events" ? prisma.exhibition.findMany({ select: { id: true, isActive: true } }) : Promise.resolve([]),
  ]);

  const categoryVisible = new Map(categories.map((category) => [category.id, category.isVisible]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const exhibitionById = new Map(exhibitions.map((exhibition) => [exhibition.id, exhibition]));
  const shortcuts = items.filter((item) => item.kind === "shortcut");
  const sections = items.filter((item) => item.kind === "section");
  const page = DISPLAY_PAGES.find((item) => item.key === pageKey) ?? DISPLAY_PAGES[0];

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">전시관리</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">{PAGE_COPY[pageKey]}</p>
        </div>
        <button className="btn" type="submit" form="display-form">
          저장
        </button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="전시 페이지">
        {DISPLAY_PAGES.map((item) => (
          <Link
            key={item.key}
            href={`/admin/display?page=${item.key}`}
            className={`inline-flex h-9 items-center rounded-md border px-4 text-sm ${
              item.key === pageKey ? "border-slate-700 bg-slate-700 text-white" : "border-line bg-white text-slate-700"
            }`}
            aria-current={item.key === pageKey ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form id="display-form" action={saveDisplayItems}>
        <input type="hidden" name="pageKey" value={pageKey} />

        {pageKey === "home" ? (
          <>
            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">바로가기</h2>
                <p className="mt-1 text-sm text-muted">{page.label} 원형 메뉴에 보이는 항목입니다.</p>
              </div>
              <AdminCreateModal title="바로가기 추가" triggerLabel="바로가기 추가" action={createDisplayShortcut}>
                <label className="text-sm font-medium">
                  이름
                  <input className="field mt-2" name="label" required maxLength={40} />
                </label>
                <label className="text-sm font-medium">
                  링크
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
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th>노출</th>
                    <th>항목</th>
                    <th>구분</th>
                    <th>아이콘</th>
                    <th>링크</th>
                    <th>정렬</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shortcuts.map((item) => {
                    const categoryHidden = item.refId !== "" && categoryVisible.get(item.refId) === false;
                    const custom = item.slotKey.startsWith("link:custom:");
                    return (
                      <tr key={item.id} className="border-t border-line">
                        <td>
                          <input type="hidden" name="id" value={item.id} />
                          <ExposureCheckbox id={item.id} checked={item.isVisible} />
                        </td>
                        <td>
                          {item.refId ? (
                            <span>
                              {item.label}
                              {categoryHidden ? <span className="ml-2 text-xs text-muted">카테고리 숨김</span> : null}
                            </span>
                          ) : (
                            <input className="field" name={`label:${item.id}`} defaultValue={item.label} maxLength={40} />
                          )}
                        </td>
                        <td>{item.refId ? "카테고리" : "바로가기"}</td>
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
                          {custom ? (
                            <button className="btn btn-ghost" type="submit" form={`delete-display-${item.id}`}>
                              삭제
                            </button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 className="mt-10 text-base font-semibold">화면 섹션</h2>
            <p className="mt-1 text-sm text-muted">위에서 아래 순서로 홈에 배치됩니다.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th>노출</th>
                    <th>섹션</th>
                    <th>연결 링크</th>
                    <th>정렬</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((item) => {
                    const heading = item.slotKey === "section:best" || item.slotKey === "section:promotion";
                    const linked = item.slotKey === "section:hero" || item.slotKey === "section:coupon";
                    return (
                      <tr key={item.id} className="border-t border-line">
                        <td>
                          <input type="hidden" name="id" value={item.id} />
                          <ExposureCheckbox id={item.id} checked={item.isVisible} />
                        </td>
                        <td>
                          {heading ? (
                            <input className="field" name={`label:${item.id}`} defaultValue={item.label} maxLength={40} />
                          ) : (
                            item.label
                          )}
                        </td>
                        <td>
                          {linked ? (
                            <input className="field" name={`href:${item.id}`} defaultValue={item.href} />
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <SortField id={item.id} value={item.sortOrder} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {pageKey === "products" ? (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>노출</th>
                  <th>카테고리</th>
                  <th>주소</th>
                  <th>정렬</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td>
                      <input type="hidden" name="id" value={item.id} />
                      <ExposureCheckbox id={item.id} checked={item.isVisible} />
                    </td>
                    <td>
                      {item.label}
                      {categoryVisible.get(item.refId) === false ? (
                        <span className="ml-2 text-xs text-muted">카테고리 숨김</span>
                      ) : null}
                    </td>
                    <td className="text-muted">{item.href}</td>
                    <td>
                      <SortField id={item.id} value={item.sortOrder} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pageKey === "best" ? (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>노출</th>
                  <th>상품</th>
                  <th>카테고리</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const product = productById.get(item.refId);
                  return (
                    <tr key={item.id} className="border-t border-line">
                      <td>
                        <input type="hidden" name="id" value={item.id} />
                        <ExposureCheckbox id={item.id} checked={item.isVisible} />
                      </td>
                      <td className="product-name">{item.label}</td>
                      <td>{product?.category.name ?? "—"}</td>
                      <td>{product?.isPublished === false ? "비공개" : "공개"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {pageKey === "events" ? (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>노출</th>
                  <th>기획전</th>
                  <th>정렬</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted">
                      등록된 기획전이 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-line">
                      <td>
                        <input type="hidden" name="id" value={item.id} />
                        <ExposureCheckbox id={item.id} checked={item.isVisible} />
                      </td>
                      <td>{item.label}</td>
                      <td>
                        <SortField id={item.id} value={item.sortOrder} />
                      </td>
                      <td>{exhibitionById.get(item.refId)?.isActive === false ? "비공개" : "공개"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button className="btn" type="submit">
            저장
          </button>
        </div>
      </form>
      {shortcuts
        .filter((item) => item.slotKey.startsWith("link:custom:"))
        .map((item) => (
          <form key={item.id} id={`delete-display-${item.id}`} action={deleteDisplayShortcut}>
            <input type="hidden" name="id" value={item.id} />
          </form>
        ))}
    </div>
  );
}
