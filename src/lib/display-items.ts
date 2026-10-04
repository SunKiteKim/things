import type { PrismaClient } from "@prisma/client";

export const DISPLAY_PAGES = [
  { key: "home", label: "홈" },
  { key: "products", label: "전체상품" },
  { key: "best", label: "베스트" },
  { key: "events", label: "이벤트" },
] as const;

export type DisplayPageKey = (typeof DISPLAY_PAGES)[number]["key"];

export const SHORTCUT_ICONS = ["object", "light", "table", "textile", "scent", "event", "coupon", "account"] as const;

export type ShortcutIcon = (typeof SHORTCUT_ICONS)[number];

export const SHORTCUT_ICON_LABEL: Record<ShortcutIcon, string> = {
  object: "오브젝트",
  light: "조명",
  table: "테이블",
  textile: "패브릭",
  scent: "향",
  event: "캘린더",
  coupon: "쿠폰",
  account: "계정",
};

export const HOME_SECTIONS = [
  { slotKey: "section:hero", label: "메인 배너", href: "/category/object", sortOrder: 1 },
  { slotKey: "section:quick", label: "퀵 메뉴", href: "", sortOrder: 2 },
  { slotKey: "section:best", label: "Best Selling", href: "", sortOrder: 3 },
  { slotKey: "section:coupon", label: "쿠폰 배너", href: "/events", sortOrder: 4 },
  { slotKey: "section:promotion", label: "Promotion product2", href: "", sortOrder: 5 },
] as const;

const HOME_LINKS = [
  { slotKey: "link:events", label: "이벤트", href: "/events", icon: "event", sortOrder: 90 },
  { slotKey: "link:coupons", label: "쿠폰", href: "/events", icon: "coupon", sortOrder: 91 },
  { slotKey: "link:account", label: "마이", href: "/mypage", icon: "account", sortOrder: 92 },
] as const;

export const ASSIGN_AREAS = {
  "quick-category": { pageKey: "home", kind: "shortcut", slot: (id: string) => `category:${id}` },
  "home-best": { pageKey: "home", kind: "product", slot: (id: string) => `best-product:${id}` },
  "home-promotion": { pageKey: "home", kind: "product", slot: (id: string) => `promotion-product:${id}` },
  products: { pageKey: "products", kind: "category", slot: (id: string) => `category:${id}` },
  best: { pageKey: "best", kind: "product", slot: (id: string) => `product:${id}` },
  events: { pageKey: "events", kind: "exhibition", slot: (id: string) => `exhibition:${id}` },
} as const;

export type AssignArea = keyof typeof ASSIGN_AREAS;

export function isDisplayPage(value: string): value is DisplayPageKey {
  return DISPLAY_PAGES.some((page) => page.key === value);
}

export function shortcutIcon(value: string): ShortcutIcon {
  return (SHORTCUT_ICONS as readonly string[]).includes(value) ? (value as ShortcutIcon) : "object";
}

type DisplayRow = {
  id: string;
  pageKey: string;
  slotKey: string;
  kind: string;
  refId: string;
  label: string;
  href: string;
};

function markerKey(slotKey: string) {
  return `system:${slotKey}`;
}

export async function syncDisplayItems(db: PrismaClient) {
  const [categories, products, exhibitions, existing] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ orderBy: { sortOrder: "asc" } }),
    db.exhibition.findMany({ orderBy: { startAt: "desc" } }),
    db.displayItem.findMany(),
  ]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const exhibitionById = new Map(exhibitions.map((exhibition) => [exhibition.id, exhibition]));
  const known = new Set(existing.map((item) => `${item.pageKey}:${item.slotKey}`));

  const missingSections = HOME_SECTIONS.filter((section) => !known.has(`home:${section.slotKey}`)).map((section) => ({
    pageKey: "home",
    slotKey: section.slotKey,
    kind: "section",
    refId: "",
    label: section.label,
    href: section.href,
    icon: "",
    sortOrder: section.sortOrder,
    isVisible: true,
  }));
  if (missingSections.length > 0) {
    await db.displayItem.createMany({ data: missingSections, skipDuplicates: true });
  }

  const orphanIds = existing
    .filter((item) => {
      if (item.kind === "section" || item.kind === "meta" || item.refId === "") return false;
      if (item.kind === "shortcut" || item.kind === "category") return !categoryById.has(item.refId);
      if (item.kind === "product") return !productById.has(item.refId);
      if (item.kind === "exhibition") return !exhibitionById.has(item.refId);
      return false;
    })
    .map((item) => item.id);
  if (orphanIds.length > 0) {
    await db.displayItem.deleteMany({ where: { id: { in: orphanIds } } });
  }

  const relabel = existing.flatMap((item) => {
    if (orphanIds.includes(item.id) || item.refId === "") return [];
    const next = linkedLabel(item, categoryById, productById, exhibitionById);
    if (!next || (next.label === item.label && next.href === item.href)) return [];
    return [{ id: item.id, ...next }];
  });
  if (relabel.length > 0) {
    await db.$transaction(
      relabel.map((item) =>
        db.displayItem.update({
          where: { id: item.id },
          data: { label: item.label, href: item.href },
        }),
      ),
    );
  }

  await ensureMarker(db, known, "quick-menu", async () => {
    if (existing.some((item) => item.pageKey === "home" && item.kind === "shortcut")) return;
    const visibleCategories = categories.filter((category) => category.isVisible);
    const shortcuts = [
      ...visibleCategories.map((category, index) => ({
        pageKey: "home",
        slotKey: `category:${category.id}`,
        kind: "shortcut",
        refId: category.id,
        label: category.name,
        href: `/category/${category.slug}`,
        icon: shortcutIcon(category.slug),
        sortOrder: category.sortOrder || index + 1,
        isVisible: true,
      })),
      ...HOME_LINKS.map((link) => ({
        pageKey: "home",
        slotKey: link.slotKey,
        kind: "shortcut",
        refId: "",
        label: link.label,
        href: link.href,
        icon: link.icon,
        sortOrder: link.sortOrder,
        isVisible: true,
      })),
    ];
    if (shortcuts.length > 0) {
      await db.displayItem.createMany({ data: shortcuts, skipDuplicates: true });
    }
  });

  await ensureMarker(db, known, "product-filters", async () => {
    if (existing.some((item) => item.pageKey === "products" && item.kind === "category")) return;
    const filters = categories
      .filter((category) => category.isVisible)
      .map((category, index) => ({
        pageKey: "products",
        slotKey: `category:${category.id}`,
        kind: "category",
        refId: category.id,
        label: category.name,
        href: `/products?category=${category.slug}`,
        icon: "",
        sortOrder: category.sortOrder || index + 1,
        isVisible: true,
      }));
    if (filters.length > 0) {
      await db.displayItem.createMany({ data: filters, skipDuplicates: true });
    }
  });

  await ensureMarker(db, known, "events", async () => {
    if (existing.some((item) => item.pageKey === "events" && item.kind === "exhibition")) return;
    const rows = exhibitions
      .filter((exhibition) => exhibition.isActive)
      .map((exhibition, index) => ({
        pageKey: "events",
        slotKey: `exhibition:${exhibition.id}`,
        kind: "exhibition",
        refId: exhibition.id,
        label: exhibition.title,
        href: `/events/${exhibition.slug}`,
        icon: "",
        sortOrder: index + 1,
        isVisible: true,
      }));
    if (rows.length > 0) {
      await db.displayItem.createMany({ data: rows, skipDuplicates: true });
    }
  });

  await ensureMarker(db, known, "home-products", async () => {
    const hasHomeProducts = existing.some(
      (item) => item.pageKey === "home" && (item.slotKey.startsWith("best-product:") || item.slotKey.startsWith("promotion-product:")),
    );
    if (hasHomeProducts) return;
    const published = products.filter((product) => product.isPublished);
    const featured = published.filter((product) => product.isFeatured).slice(0, 4);
    const featuredIds = new Set(featured.map((product) => product.id));
    const promotion = published.filter((product) => !featuredIds.has(product.id)).slice(0, 4);
    const rows = [
      ...featured.map((product, index) => ({
        pageKey: "home",
        slotKey: `best-product:${product.id}`,
        kind: "product",
        refId: product.id,
        label: product.name,
        href: `/product/${product.id}`,
        icon: "",
        sortOrder: index + 1,
        isVisible: true,
      })),
      ...promotion.map((product, index) => ({
        pageKey: "home",
        slotKey: `promotion-product:${product.id}`,
        kind: "product",
        refId: product.id,
        label: product.name,
        href: `/product/${product.id}`,
        icon: "",
        sortOrder: index + 1,
        isVisible: true,
      })),
    ];
    if (rows.length > 0) {
      await db.displayItem.createMany({ data: rows, skipDuplicates: true });
    }
  });
}

function linkedLabel(
  item: DisplayRow,
  categories: Map<string, { name: string; slug: string }>,
  products: Map<string, { name: string; id: string }>,
  exhibitions: Map<string, { title: string; slug: string }>,
) {
  if (item.kind === "shortcut" || item.kind === "category") {
    const category = categories.get(item.refId);
    if (!category) return null;
    return {
      label: category.name,
      href: item.pageKey === "products" ? `/products?category=${category.slug}` : `/category/${category.slug}`,
    };
  }
  if (item.kind === "product") {
    const product = products.get(item.refId);
    if (!product) return null;
    return { label: product.name, href: `/product/${product.id}` };
  }
  if (item.kind === "exhibition") {
    const exhibition = exhibitions.get(item.refId);
    if (!exhibition) return null;
    return { label: exhibition.title, href: `/events/${exhibition.slug}` };
  }
  return null;
}

async function ensureMarker(db: PrismaClient, known: Set<string>, slotKey: string, fill: () => Promise<void>) {
  const key = markerKey(slotKey);
  if (known.has(key)) return;
  await fill();
  await db.displayItem.createMany({
    data: [
      {
        pageKey: "system",
        slotKey,
        kind: "meta",
        refId: "",
        label: slotKey,
        href: "",
        icon: "",
        sortOrder: 0,
        isVisible: false,
      },
    ],
    skipDuplicates: true,
  });
  known.add(key);
}
