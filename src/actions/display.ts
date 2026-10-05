"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LIMITS, slugify } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import { setAdminFlash } from "@/lib/admin-flash";
import { ASSIGN_AREAS, isDisplayPage, shortcutIcon, type AssignArea } from "@/lib/display-items";

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/best");
  revalidatePath("/events");
  revalidatePath("/admin/display");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string) {
  return Number(text(formData, key) || 0);
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export async function createCategory(formData: FormData) {
  if (!(await requireAdmin())) return;
  const count = await prisma.category.count();
  if (count >= LIMITS.MAX_CATEGORIES) {
    return;
  }
  const name = text(formData, "name");
  if (!name) return;
  await prisma.category.create({
    data: {
      name,
      slug: text(formData, "slug") || slugify(name),
      description: text(formData, "description"),
      imageUrl: text(formData, "imageUrl"),
      sortOrder: num(formData, "sortOrder"),
      isVisible: bool(formData, "isVisible"),
    },
  });
  await setAdminFlash("카테고리가 등록되었습니다.");
  revalidatePath("/admin/display/categories");
  revalidateStorefront();
  return;
}

export async function updateCategory(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  await prisma.category.update({
    where: { id },
    data: {
      name,
      slug: text(formData, "slug") || slugify(name),
      description: text(formData, "description"),
      imageUrl: text(formData, "imageUrl"),
      sortOrder: num(formData, "sortOrder"),
      isVisible: bool(formData, "isVisible"),
    },
  });
  await setAdminFlash("카테고리가 수정되었습니다.");
  revalidatePath("/admin/display/categories");
  revalidateStorefront();
  return;
}

export async function deleteCategory(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const used = await prisma.product.count({ where: { categoryId: id } });
  if (used > 0) return;
  await prisma.category.delete({ where: { id } });
  await setAdminFlash("카테고리가 삭제되었습니다.");
  revalidatePath("/admin/display/categories");
  revalidateStorefront();
  return;
}

export async function createBanner(formData: FormData) {
  if (!(await requireAdmin())) return;
  const title = text(formData, "title");
  if (!title) return;
  await prisma.banner.create({
    data: {
      title,
      subtitle: text(formData, "subtitle"),
      imageUrl: text(formData, "imageUrl"),
      href: text(formData, "href") || "/",
      sortOrder: num(formData, "sortOrder"),
      isActive: bool(formData, "isActive"),
    },
  });
  await setAdminFlash("배너가 등록되었습니다.");
  revalidatePath("/admin/display/banners");
  revalidatePath("/");
  return;
}

export async function updateBanner(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  if (!id) return;
  await prisma.banner.update({
    where: { id },
    data: {
      title: text(formData, "title"),
      subtitle: text(formData, "subtitle"),
      imageUrl: text(formData, "imageUrl"),
      href: text(formData, "href") || "/",
      sortOrder: num(formData, "sortOrder"),
      isActive: bool(formData, "isActive"),
    },
  });
  await setAdminFlash("배너가 수정되었습니다.");
  revalidatePath("/admin/display/banners");
  revalidatePath("/");
  return;
}

export async function deleteBanner(formData: FormData) {
  if (!(await requireAdmin())) return;
  await prisma.banner.delete({ where: { id: text(formData, "id") } });
  await setAdminFlash("배너가 삭제되었습니다.");
  revalidatePath("/admin/display/banners");
  revalidatePath("/");
  return;
}

export async function saveDisplayItems(formData: FormData) {
  if (!(await requireAdmin())) return;
  const pageKey = text(formData, "pageKey");
  if (!isDisplayPage(pageKey)) return;

  const ids = [...new Set(formData.getAll("id").map((value) => String(value)).filter(Boolean))];
  if (ids.length === 0) return;

  const items = await prisma.displayItem.findMany({ where: { id: { in: ids }, pageKey } });
  if (items.length === 0) return;
  await prisma.$transaction(
    items.map((item) => {
      const rawSort = formData.get(`sort:${item.id}`);
      const parsedSort = rawSort === null ? Number.NaN : Number(String(rawSort).trim());
      const sortOrder = Number.isFinite(parsedSort)
        ? Math.max(0, Math.min(9999, Math.round(parsedSort)))
        : item.sortOrder;
      const data: { sortOrder: number; isVisible?: boolean; label?: string; href?: string; icon?: string } = {
        sortOrder,
      };
      if (item.kind === "section") {
        data.isVisible = formData.get(`visible:${item.id}`) === "on";
      }

      const editableLink = item.kind === "shortcut" && item.refId === "";
      const editableHeading = item.slotKey === "section:best" || item.slotKey === "section:promotion" || item.slotKey === "section:timesale";
      const editableHref = item.slotKey === "section:hero" || item.slotKey === "section:coupon" || item.slotKey === "section:timesale";
      if (editableLink || editableHeading) {
        const label = text(formData, `label:${item.id}`).slice(0, 40);
        if (label) data.label = label;
      }
      if (editableLink || editableHref) {
        const href = text(formData, `href:${item.id}`).slice(0, 200);
        if (href) data.href = href;
      }
      if (item.kind === "shortcut") {
        const icon = text(formData, `icon:${item.id}`);
        if (icon) data.icon = shortcutIcon(icon);
      }

      return prisma.displayItem.update({ where: { id: item.id }, data });
    }),
  );

  await setAdminFlash("전시 설정이 저장되었습니다.");
  revalidateStorefront();
}

export async function createDisplayShortcut(formData: FormData) {
  if (!(await requireAdmin())) return;
  const label = text(formData, "label").slice(0, 40);
  const href = text(formData, "href").slice(0, 200);
  if (!label || !href) return;

  const max = await prisma.displayItem.aggregate({
    where: { pageKey: "home", kind: "shortcut" },
    _max: { sortOrder: true },
  });
  await prisma.displayItem.create({
    data: {
      pageKey: "home",
      slotKey: `link:custom:${crypto.randomUUID()}`,
      kind: "shortcut",
      label,
      href,
      icon: shortcutIcon(text(formData, "icon")),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      isVisible: true,
    },
  });
  await setAdminFlash("퀵메뉴에 추가되었습니다.");
  revalidateStorefront();
}

function isAssignArea(value: string): value is AssignArea {
  return value in ASSIGN_AREAS;
}

export async function assignDisplayContent(formData: FormData) {
  if (!(await requireAdmin())) return;
  const areaKey = text(formData, "area");
  if (!isAssignArea(areaKey)) return;
  const area = ASSIGN_AREAS[areaKey];
  const refIds = [...new Set(formData.getAll("refId").map((value) => String(value)).filter(Boolean))];
  if (refIds.length === 0) return;

  const [categories, products, exhibitions, current] = await Promise.all([
    prisma.category.findMany({ where: { id: { in: refIds } } }),
    prisma.product.findMany({ where: { id: { in: refIds } } }),
    prisma.exhibition.findMany({ where: { id: { in: refIds } } }),
    prisma.displayItem.aggregate({
      where: { pageKey: area.pageKey, kind: area.kind },
      _max: { sortOrder: true },
    }),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const exhibitionById = new Map(exhibitions.map((exhibition) => [exhibition.id, exhibition]));

  let sortOrder = (current._max.sortOrder ?? 0) + 1;
  for (const refId of refIds) {
    const slotKey = area.slot(refId);
    const content = contentForArea(areaKey, refId, categoryById, productById, exhibitionById);
    if (!content) continue;
    await prisma.displayItem.upsert({
      where: { pageKey_slotKey: { pageKey: area.pageKey, slotKey } },
      create: {
        pageKey: area.pageKey,
        slotKey,
        kind: area.kind,
        refId,
        label: content.label,
        href: content.href,
        icon: content.icon,
        sortOrder,
        isVisible: true,
      },
      update: {
        label: content.label,
        href: content.href,
        isVisible: true,
      },
    });
    sortOrder += 1;
  }

  await setAdminFlash("영역에 컨텐츠를 추가했습니다.");
  revalidateStorefront();
}

function contentForArea(
  area: AssignArea,
  refId: string,
  categories: Map<string, { name: string; slug: string }>,
  products: Map<string, { id: string; name: string }>,
  exhibitions: Map<string, { title: string; slug: string }>,
) {
  if (area === "quick-category" || area === "products") {
    const category = categories.get(refId);
    if (!category) return null;
    return {
      label: category.name,
      href: area === "products" ? `/products?category=${category.slug}` : `/category/${category.slug}`,
      icon: area === "quick-category" ? shortcutIcon(category.slug) : "",
    };
  }
  if (area === "home-best" || area === "home-promotion" || area === "home-timesale" || area === "best") {
    const product = products.get(refId);
    if (!product) return null;
    return { label: product.name, href: `/product/${product.id}`, icon: "" };
  }
  const exhibition = exhibitions.get(refId);
  if (!exhibition) return null;
  return { label: exhibition.title, href: `/events/${exhibition.slug}`, icon: "" };
}

export async function removeDisplayItem(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  if (!id) return;
  const item = await prisma.displayItem.findUnique({ where: { id } });
  if (!item || item.kind === "section" || item.kind === "meta") return;
  await prisma.displayItem.delete({ where: { id } });
  await setAdminFlash("영역에서 컨텐츠를 제외했습니다.");
  revalidateStorefront();
}
