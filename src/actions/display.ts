"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LIMITS, slugify } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import { setAdminFlash } from "@/lib/admin-flash";
import { isDisplayPage, shortcutIcon } from "@/lib/display-items";

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
      const data: { sortOrder: number; isVisible: boolean; label?: string; href?: string; icon?: string } = {
        sortOrder,
        isVisible: formData.get(`visible:${item.id}`) === "on",
      };

      const editableLink = item.kind === "shortcut" && item.refId === "";
      const editableHeading = item.slotKey === "section:best" || item.slotKey === "section:promotion";
      const editableHref = item.slotKey === "section:hero" || item.slotKey === "section:coupon";
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
  await setAdminFlash("바로가기가 추가되었습니다.");
  revalidateStorefront();
}

export async function deleteDisplayShortcut(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  if (!id) return;
  const item = await prisma.displayItem.findUnique({ where: { id } });
  if (!item || item.pageKey !== "home" || !item.slotKey.startsWith("link:custom:")) return;
  await prisma.displayItem.delete({ where: { id } });
  await setAdminFlash("바로가기가 삭제되었습니다.");
  revalidateStorefront();
}
