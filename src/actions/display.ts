"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LIMITS, slugify } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";

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
  revalidatePath("/admin/display/categories");
  revalidatePath("/");
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
  revalidatePath("/admin/display/categories");
  revalidatePath("/");
  return;
}

export async function deleteCategory(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const used = await prisma.product.count({ where: { categoryId: id } });
  if (used > 0) return;
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/display/categories");
  revalidatePath("/");
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
  revalidatePath("/admin/display/banners");
  revalidatePath("/");
  return;
}

export async function deleteBanner(formData: FormData) {
  if (!(await requireAdmin())) return;
  await prisma.banner.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/display/banners");
  revalidatePath("/");
  return;
}
