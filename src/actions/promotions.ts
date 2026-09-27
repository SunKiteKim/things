"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import { setAdminFlash } from "@/lib/admin-flash";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string) {
  return Number(text(formData, key) || 0);
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function productIds(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map(String).filter(Boolean))];
}

async function uniqueCouponCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `CPN-${randomBytes(6).toString("hex").toUpperCase()}`;
    if (!(await prisma.coupon.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new Error("고유 쿠폰 코드를 생성하지 못했습니다.");
}

function validateCoupon(formData: FormData) {
  const type = text(formData, "discountType");
  const scope = text(formData, "scope");
  const value = num(formData, "discountValue");
  const minimum = num(formData, "minQuantity");
  const amount = num(formData, "minOrderAmount");
  const maxUses = num(formData, "maxUses");
  const start = new Date(text(formData, "startAt"));
  const end = new Date(text(formData, "endAt"));
  const included = productIds(formData, "includedProductIds");
  const onePlusOne = scope === "ONE_PLUS_ONE";
  if (!["CART", "MULTI_CART", "PRODUCT", "ONE_PLUS_ONE"].includes(scope) || (!onePlusOne && (!["PERCENT", "AMOUNT"].includes(type) || !Number.isSafeInteger(value) || value <= 0 || (type === "PERCENT" && value > 100))) || ![minimum, amount, maxUses].every(n => Number.isSafeInteger(n) && n >= 0) || (["PRODUCT", "ONE_PLUS_ONE"].includes(scope) && included.length === 0) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) throw new Error("쿠폰 유형, 적용 상품, 할인값, 최소 수량·금액, 사용 기간을 확인해 주세요.");
}

export async function createCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  validateCoupon(formData);
  const code = await uniqueCouponCode();
  const scope = text(formData, "scope");
  const excluded = productIds(formData, "excludedProductIds");
  const included = productIds(formData, "includedProductIds").filter((id) => !excluded.includes(id));
  await prisma.coupon.create({
    data: {
      code,
      name: scope === "MULTI_CART" ? "가지가지할인" : text(formData, "name") || code,
      scope,
      includedProductIds: JSON.stringify(included),
      excludedProductIds: JSON.stringify(excluded),
      discountType: scope === "ONE_PLUS_ONE" ? "AMOUNT" : text(formData, "discountType") || "PERCENT",
      discountValue: scope === "ONE_PLUS_ONE" ? 0 : num(formData, "discountValue"),
      minOrderAmount: num(formData, "minOrderAmount"),
      minQuantity: scope === "CART" ? 0 : ["MULTI_CART", "ONE_PLUS_ONE"].includes(scope) ? Math.max(2, num(formData, "minQuantity")) : num(formData, "minQuantity"),
      maxUses: num(formData, "maxUses") || null,
      startAt: new Date(text(formData, "startAt") || Date.now()),
      endAt: new Date(text(formData, "endAt") || Date.now()),
      isActive: bool(formData, "isActive"),
    },
  });
  await setAdminFlash("쿠폰이 등록되었습니다.");
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function updateCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  validateCoupon(formData);
  const id = text(formData, "id");
  const scope = text(formData, "scope");
  const excluded = productIds(formData, "excludedProductIds");
  const included = productIds(formData, "includedProductIds").filter((productId) => !excluded.includes(productId));
  await prisma.coupon.update({
    where: { id },
    data: {
      name: scope === "MULTI_CART" ? "가지가지할인" : text(formData, "name"),
      scope,
      includedProductIds: JSON.stringify(included),
      excludedProductIds: JSON.stringify(excluded),
      discountType: scope === "ONE_PLUS_ONE" ? "AMOUNT" : text(formData, "discountType") || "PERCENT",
      discountValue: scope === "ONE_PLUS_ONE" ? 0 : num(formData, "discountValue"),
      minOrderAmount: num(formData, "minOrderAmount"),
      minQuantity: scope === "CART" ? 0 : ["MULTI_CART", "ONE_PLUS_ONE"].includes(scope) ? Math.max(2, num(formData, "minQuantity")) : num(formData, "minQuantity"),
      maxUses: num(formData, "maxUses") || null,
      startAt: new Date(text(formData, "startAt")),
      endAt: new Date(text(formData, "endAt")),
      isActive: bool(formData, "isActive"),
    },
  });
  await setAdminFlash("쿠폰 정보가 수정되었습니다.");
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function deleteCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  await prisma.coupon.delete({ where: { id: text(formData, "id") } });
  await setAdminFlash("쿠폰이 삭제되었습니다.");
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function toggleCouponPause(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { isPaused: true } });
  if (!coupon) return;
  await prisma.coupon.update({ where: { id }, data: { isPaused: !coupon.isPaused } });
  await setAdminFlash(coupon.isPaused ? "쿠폰 사용이 재개되었습니다." : "쿠폰이 일시중지되었습니다.");
  revalidatePath("/admin/promotions/coupons");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function issueCoupon(formData: FormData) {
  if (!(await requireAdmin())) return;
  const couponId = text(formData, "couponId");
  const targetType = text(formData, "targetType");
  const targetIds = [...new Set(formData.getAll("targetIds").map(String).filter(Boolean))];
  if (!couponId || !["USER", "CATEGORY"].includes(targetType) || targetIds.length === 0) return;
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId }, select: { isActive: true, isPaused: true } });
  if (!coupon?.isActive || coupon.isPaused) throw new Error("일시중지되었거나 사용할 수 없는 쿠폰은 발행할 수 없습니다.");
  const validIds = targetType === "USER"
    ? (await prisma.user.findMany({ where: { id: { in: targetIds }, role: "MEMBER" }, select: { id: true } })).map((row) => row.id)
    : (await prisma.category.findMany({ where: { id: { in: targetIds } }, select: { id: true } })).map((row) => row.id);
  const issued = await prisma.couponIssue.createMany({
    data: validIds.map((targetId) => ({
      couponId,
      targetType,
      userId: targetType === "USER" ? targetId : null,
      categoryId: targetType === "CATEGORY" ? targetId : null,
    })),
    skipDuplicates: true,
  });
  await setAdminFlash(issued.count > 0 ? `쿠폰이 ${issued.count}개 대상에 발행되었습니다.` : "이미 발행된 대상입니다.");
  revalidatePath("/admin/promotions/coupons");
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
  await setAdminFlash("기획전이 등록되었습니다.");
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
  await setAdminFlash("기획전이 수정되었습니다.");
  revalidatePath("/admin/promotions/exhibitions");
  revalidatePath("/events");
  return;
}

export async function deleteExhibition(formData: FormData) {
  if (!(await requireAdmin())) return;
  await prisma.exhibition.delete({ where: { id: text(formData, "id") } });
  await setAdminFlash("기획전이 삭제되었습니다.");
  revalidatePath("/admin/promotions/exhibitions");
  revalidatePath("/events");
  return;
}
