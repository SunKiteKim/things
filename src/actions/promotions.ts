"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
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

export async function createCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  const code = text(formData, "code").toUpperCase();
  if (!code) return;
  await prisma.coupon.create({
    data: {
      code,
      name: text(formData, "name") || code,
      discountType: text(formData, "discountType") || "PERCENT",
      discountValue: num(formData, "discountValue"),
      minOrderAmount: num(formData, "minOrderAmount"),
      maxUses: num(formData, "maxUses") || null,
      startAt: new Date(text(formData, "startAt") || Date.now()),
      endAt: new Date(text(formData, "endAt") || Date.now()),
      isActive: bool(formData, "isActive"),
    },
  });
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function updateCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  await prisma.coupon.update({
    where: { id },
    data: {
      code: text(formData, "code").toUpperCase(),
      name: text(formData, "name"),
      discountType: text(formData, "discountType") || "PERCENT",
      discountValue: num(formData, "discountValue"),
      minOrderAmount: num(formData, "minOrderAmount"),
      maxUses: num(formData, "maxUses") || null,
      startAt: new Date(text(formData, "startAt")),
      endAt: new Date(text(formData, "endAt")),
      isActive: bool(formData, "isActive"),
    },
  });
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function deleteCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  await prisma.coupon.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function createExhibition(formData: FormData) {
  if (!(await requireAdmin())) return;
  const title = text(formData, "title");
  if (!title) return;
  const productIds = formData.getAll("productIds").map(String);
  await prisma.exhibition.create({
    data: {
      title,
      slug: text(formData, "slug") || slugify(title),
      description: text(formData, "description"),
      imageUrl: text(formData, "imageUrl"),
      startAt: new Date(text(formData, "startAt") || Date.now()),
      endAt: new Date(text(formData, "endAt") || Date.now()),
      isActive: bool(formData, "isActive"),
      products: {
        create: productIds.map((productId) => ({ productId })),
      },
    },
  });
  revalidatePath("/admin/promotions/exhibitions");
  revalidatePath("/events");
  return;
}

export async function updateExhibition(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const productIds = formData.getAll("productIds").map(String);
  await prisma.exhibitionProduct.deleteMany({ where: { exhibitionId: id } });
  await prisma.exhibition.update({
    where: { id },
    data: {
      title: text(formData, "title"),
      slug: text(formData, "slug") || slugify(text(formData, "title")),
      description: text(formData, "description"),
      imageUrl: text(formData, "imageUrl"),
      startAt: new Date(text(formData, "startAt")),
      endAt: new Date(text(formData, "endAt")),
      isActive: bool(formData, "isActive"),
      products: {
        create: productIds.map((productId) => ({ productId })),
      },
    },
  });
  revalidatePath("/admin/promotions/exhibitions");
  revalidatePath("/events");
  return;
}

export async function deleteExhibition(formData: FormData) {
  if (!(await requireAdmin())) return;
  await prisma.exhibition.delete({ where: { id: text(formData, "id") } });
  revalidatePath("/admin/promotions/exhibitions");
  revalidatePath("/events");
  return;
}
