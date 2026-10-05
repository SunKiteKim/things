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

function exhibitionDiscount(formData: FormData) {
  const discountType = text(formData, "discountType") || "NONE";
  const discountValue = num(formData, "discountValue");
  if (discountType === "NONE") return { discountType: "NONE", discountValue: 0 };
  if (discountValue <= 0) return null;
  if (discountType === "PERCENT" && Number.isSafeInteger(discountValue) && discountValue >= 1 && discountValue <= 100) return { discountType, discountValue };
  if (discountType === "AMOUNT" && Number.isSafeInteger(discountValue) && discountValue > 0) return { discountType, discountValue };
  return null;
}

async function existingProductIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const found = new Set(rows.map((row) => row.id));
  return ids.filter((id) => found.has(id));
}

function revalidateExhibitionStore(productIds: string[]) {
  revalidatePath("/admin/promotions/exhibitions");
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/best");
  revalidatePath("/search");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  for (const productId of productIds) revalidatePath(`/product/${productId}`);
}

async function uniqueCouponCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `CPN-${randomBytes(6).toString("hex").toUpperCase()}`;
    if (!(await prisma.coupon.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new Error("고유 쿠폰 코드를 생성하지 못했습니다.");
}

function validateCoupon(formData: FormData) {
  const name = text(formData, "name");
  const type = text(formData, "discountType");
  const scope = text(formData, "scope");
  const value = num(formData, "discountValue");
  const minimum = num(formData, "minQuantity");
  const amount = num(formData, "minOrderAmount");
  const maxUses = num(formData, "maxUses");
  const start = new Date(text(formData, "startAt"));
  const end = new Date(text(formData, "endAt"));
  const onePlusOne = scope === "ONE_PLUS_ONE";
  if (!name || !["CART", "MULTI_CART", "PRODUCT", "ONE_PLUS_ONE"].includes(scope) || (!onePlusOne && (!["PERCENT", "AMOUNT"].includes(type) || !Number.isSafeInteger(value) || value <= 0 || (type === "PERCENT" && value > 100))) || ![minimum, amount, maxUses].every(n => Number.isSafeInteger(n) && n >= 0) || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) throw new Error("쿠폰명, 쿠폰 유형, 할인값, 최소 수량·금액, 사용 기간을 확인해 주세요.");
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
      name: text(formData, "name"),
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
      isStackable: bool(formData, "isStackable"),
    },
  });
  await setAdminFlash("쿠폰이 등록되었습니다.");
  revalidatePath("/admin/promotions/coupons");
  return;
}

export async function updateCoupon(formData: FormData) {
  if (!(await requireAdmin())) return { ok: false, error: "관리자 로그인이 필요합니다." };
  try {
    validateCoupon(formData);
    const id = text(formData, "id");
    const scope = text(formData, "scope");
    const excluded = productIds(formData, "excludedProductIds");
    const included = productIds(formData, "includedProductIds").filter((productId) => !excluded.includes(productId));
    await prisma.coupon.update({
      where: { id },
      data: {
        name: text(formData, "name"),
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
        isStackable: bool(formData, "isStackable"),
      },
    });
    await setAdminFlash("쿠폰 정보가 수정되었습니다.");
    revalidatePath("/admin/promotions/coupons");
    return { ok: true };
  } catch (error) {
    console.error("Failed to update coupon", error);
    return { ok: false, error: "쿠폰명, 쿠폰 유형, 할인 조건과 사용 기간을 확인해 주세요." };
  }
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
  const discount = exhibitionDiscount(formData);
  if (!title || !discount) {
    await setAdminFlash("기획전명과 할인 방식, 할인값을 확인해 주세요.");
    return;
  }
  const linkedProductIds = await existingProductIds(productIds(formData, "productIds"));
  await prisma.exhibition.create({
    data: {
      title,
      slug: text(formData, "slug") || slugify(title),
      description: text(formData, "description"),
      imageUrl: text(formData, "imageUrl"),
      startAt: new Date(text(formData, "startAt") || Date.now()),
      endAt: new Date(text(formData, "endAt") || Date.now()),
      isActive: bool(formData, "isActive"),
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      products: {
        create: linkedProductIds.map((productId) => ({ productId })),
      },
    },
  });
  await setAdminFlash("기획전이 등록되었습니다.");
  revalidateExhibitionStore(linkedProductIds);
  return;
}

export async function updateExhibition(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const discount = exhibitionDiscount(formData);
  if (!id || !discount) {
    await setAdminFlash("할인 방식과 할인값을 확인해 주세요. 정률은 1~100, 정액은 1원 이상입니다.");
    return;
  }
  const previous = await prisma.exhibitionProduct.findMany({ where: { exhibitionId: id }, select: { productId: true } });
  const linkedProductIds = await existingProductIds(productIds(formData, "productIds"));
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
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      products: {
        create: linkedProductIds.map((productId) => ({ productId })),
      },
    },
  });
  await setAdminFlash("기획전이 수정되었습니다.");
  revalidateExhibitionStore([...previous.map((row) => row.productId), ...linkedProductIds]);
  return;
}

export async function deleteExhibition(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const previous = await prisma.exhibitionProduct.findMany({ where: { exhibitionId: id }, select: { productId: true } });
  await prisma.exhibition.delete({ where: { id } });
  await setAdminFlash("기획전이 삭제되었습니다.");
  revalidateExhibitionStore(previous.map((row) => row.productId));
  return;
}
