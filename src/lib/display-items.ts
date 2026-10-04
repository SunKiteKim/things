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

export function isDisplayPage(value: string): value is DisplayPageKey {
  return DISPLAY_PAGES.some((page) => page.key === value);
}

export function shortcutIcon(value: string): ShortcutIcon {
  return (SHORTCUT_ICONS as readonly string[]).includes(value) ? (value as ShortcutIcon) : "object";
}

type DesiredDisplayItem = {
  pageKey: string;
  slotKey: string;
  kind: string;
  refId: string;
  label: string;
  href: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
};

function refreshesFromSource(item: DesiredDisplayItem) {
  return item.kind === "category" || item.kind === "product" || item.kind === "exhibition" || (item.kind === "shortcut" && item.refId !== "");
}

export async function syncDisplayItems(db: PrismaClient) {
  const [categories, products, exhibitions, existing] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ orderBy: { registeredAt: "desc" } }),
    db.exhibition.findMany({ orderBy: { startAt: "desc" } }),
    db.displayItem.findMany(),
  ]);

  const desired: DesiredDisplayItem[] = [
    ...HOME_SECTIONS.map((section) => ({
      pageKey: "home",
      slotKey: section.slotKey,
      kind: "section",
      refId: "",
      label: section.label,
      href: section.href,
      icon: "",
      sortOrder: section.sortOrder,
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

  categories.forEach((category, index) => {
    const sortOrder = category.sortOrder || index + 1;
    desired.push({
      pageKey: "home",
      slotKey: `category:${category.id}`,
      kind: "shortcut",
      refId: category.id,
      label: category.name,
      href: `/category/${category.slug}`,
      icon: shortcutIcon(category.slug),
      sortOrder,
      isVisible: category.isVisible,
    });
    desired.push({
      pageKey: "products",
      slotKey: `category:${category.id}`,
      kind: "category",
      refId: category.id,
      label: category.name,
      href: `/products?category=${category.slug}`,
      icon: "",
      sortOrder,
      isVisible: category.isVisible,
    });
  });

  products.forEach((product, index) => {
    desired.push({
      pageKey: "best",
      slotKey: `product:${product.id}`,
      kind: "product",
      refId: product.id,
      label: product.name,
      href: `/product/${product.id}`,
      icon: "",
      sortOrder: index + 1,
      isVisible: product.isPublished,
    });
  });

  exhibitions.forEach((exhibition, index) => {
    desired.push({
      pageKey: "events",
      slotKey: `exhibition:${exhibition.id}`,
      kind: "exhibition",
      refId: exhibition.id,
      label: exhibition.title,
      href: `/events/${exhibition.slug}`,
      icon: "",
      sortOrder: index + 1,
      isVisible: exhibition.isActive,
    });
  });

  const existingBySlot = new Map(existing.map((item) => [`${item.pageKey}:${item.slotKey}`, item]));
  const desiredKeys = new Set(desired.map((item) => `${item.pageKey}:${item.slotKey}`));
  const staleIds = existing
    .filter((item) => !item.slotKey.startsWith("link:custom:") && !desiredKeys.has(`${item.pageKey}:${item.slotKey}`))
    .map((item) => item.id);

  if (staleIds.length > 0) {
    await db.displayItem.deleteMany({ where: { id: { in: staleIds } } });
  }

  const missing = desired.filter((item) => !existingBySlot.has(`${item.pageKey}:${item.slotKey}`));
  if (missing.length > 0) {
    await db.displayItem.createMany({ data: missing, skipDuplicates: true });
  }

  const relabel = desired.filter((item) => {
    const current = existingBySlot.get(`${item.pageKey}:${item.slotKey}`);
    return current && refreshesFromSource(item) && (current.label !== item.label || current.href !== item.href);
  });

  if (relabel.length > 0) {
    await db.$transaction(
      relabel.map((item) =>
        db.displayItem.update({
          where: { pageKey_slotKey: { pageKey: item.pageKey, slotKey: item.slotKey } },
          data: { label: item.label, href: item.href },
        }),
      ),
    );
  }
}
