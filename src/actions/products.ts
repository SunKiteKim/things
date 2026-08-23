"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LIMITS, discountedPrice, nextProductCode, slugify } from "@/lib/utils";
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

async function nextProductId() {
  const latest = await prisma.product.findMany({
    where: { id: { startsWith: "prd" } },
    orderBy: { id: "desc" },
    take: 1,
    select: { id: true },
  });
  return nextProductCode(latest[0]?.id);
}

async function saveThumbnail(file: File | null, productId: string, fallback: string) {
  if (!file || file.size === 0) return fallback;
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(dir, { recursive: true });
  const filename = `${productId}.jpg`;
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/products/${filename}?v=${Date.now()}`;
}

async function editor(session: { user: { id?: string | null; name?: string | null; email?: string | null } }) {
  const clauses: Array<{ id: string } | { email: string }> = [];
  if (session.user.id) clauses.push({ id: session.user.id });
  if (session.user.email) clauses.push({ email: session.user.email.toLowerCase() });
  const user = clauses.length
    ? await prisma.user.findFirst({ where: { OR: clauses } })
    : null;
  return {
    updatedById: user?.id ?? null,
    updatedByName: user?.name || session.user.name || "관리자",
  };
}

function pricing(formData: FormData) {
  const originalPrice = num(formData, "originalPrice");
  const discountRate = Math.min(100, Math.max(0, num(formData, "discountRate")));
  return {
    originalPrice: originalPrice || null,
    discountRate,
    price: discountedPrice(originalPrice, discountRate),
  };
}

export async function createProduct(formData: FormData) {
  const session = await requireAdmin();
  if (!session) return;
  const count = await prisma.product.count();
  if (count >= LIMITS.MAX_PRODUCTS) return;
  const name = text(formData, "name");
  const categoryId = text(formData, "categoryId");
  if (!name || !categoryId) return;

  const id = await nextProductId();
  const now = new Date();
  const imageUrl = await saveThumbnail(
    formData.get("thumbnail") as File | null,
    id,
    text(formData, "imageUrl"),
  );
  if (!imageUrl) return;

  const product = await prisma.product.create({
    data: {
      id,
      name,
      slug: text(formData, "slug") || slugify(name),
      description: text(formData, "description"),
      ...pricing(formData),
      stock: num(formData, "stock") || 10,
      imageUrl,
      isPublished: bool(formData, "isPublished"),
      isFeatured: bool(formData, "isFeatured"),
      sortOrder: num(formData, "sortOrder"),
      categoryId,
      registeredAt: now,
      createdAt: now,
      ...(await editor(session)),
    },
  });
  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}`);
}

export async function updateProduct(formData: FormData) {
  const session = await requireAdmin();
  if (!session) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  if (!id || !name) return;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return;

  const imageUrl = await saveThumbnail(
    formData.get("thumbnail") as File | null,
    id,
    existing.imageUrl,
  );

  await prisma.product.update({
    where: { id },
    data: {
      name,
      slug: text(formData, "slug") || slugify(name),
      description: text(formData, "description"),
      ...pricing(formData),
      stock: num(formData, "stock") || existing.stock,
      imageUrl,
      isPublished: bool(formData, "isPublished"),
      isFeatured: bool(formData, "isFeatured"),
      sortOrder: existing.sortOrder,
      categoryId: text(formData, "categoryId") || existing.categoryId,
      ...(await editor(session)),
    },
  });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  return;
}

export async function deleteProduct(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  await prisma.exhibitionProduct.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  revalidatePath("/");
  return;
}

export async function updateProductDisplay(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  await prisma.product.update({
    where: { id },
    data: {
      isPublished: bool(formData, "isPublished"),
      isFeatured: bool(formData, "isFeatured"),
      sortOrder: num(formData, "sortOrder"),
    },
  });
  revalidatePath("/admin/products/display");
  revalidatePath("/");
  return;
}
