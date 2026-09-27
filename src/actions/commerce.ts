"use server";

import { couponDiscountForLines } from "@/lib/discounts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCart, setCart, getSelectedCoupon, setSelectedCoupon } from "@/lib/cart";
import { ORDER_STATUS, createOrderNumber } from "@/lib/utils";
import { requireAdmin, requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { setAdminFlash } from "@/lib/admin-flash";

export async function buyNow(productId: string, quantity = 1, onePlusOne = false) {
  const result = await addToCart(productId, quantity, onePlusOne);
  if (result.error) return result;
  redirect("/checkout");
}

export async function addToCart(productId: string, quantity = 1, onePlusOne = false) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return { error: "수량을 확인해 주세요." };
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product?.isPublished || (onePlusOne && !product.onePlusOne)) return { error: "구매할 수 없는 상품 옵션입니다." };
  const cart = await getCart();
  const used = cart.filter(line => line.productId === productId).reduce((sum, line) => sum + line.quantity * (line.onePlusOne ? 2 : 1), 0);
  if (used + quantity * (onePlusOne ? 2 : 1) > product.stock) return { error: "증정품을 포함한 재고가 부족합니다." };
  const existing = cart.find(line => line.productId === productId && !!line.onePlusOne === onePlusOne);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId, quantity, onePlusOne });
  await setCart(cart);
  revalidatePath("/cart");
  return { ok: true };
}

export async function updateCartLine(productId: string, quantity: number, onePlusOne = false) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) return { error: "수량을 확인해 주세요." };
  const cart = await getCart();
  const next = cart.filter(line => !(line.productId === productId && !!line.onePlusOne === onePlusOne));
  if (quantity > 0) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    const used = next.filter(line => line.productId === productId).reduce((sum, line) => sum + line.quantity * (line.onePlusOne ? 2 : 1), 0);
    if (!product?.isPublished || (onePlusOne && !product.onePlusOne) || used + quantity * (onePlusOne ? 2 : 1) > product.stock) return { error: "옵션 또는 재고를 확인해 주세요." };
    next.push({ productId, quantity, onePlusOne });
  }
  await setCart(next);
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function clearCart() {
  await setCart([]);
  await setSelectedCoupon("");
  revalidatePath("/cart");
}

export async function removeCartLines(lines: Array<{ productId: string; onePlusOne?: boolean }>) {
  if (!Array.isArray(lines) || lines.length === 0) return { error: "삭제할 상품을 선택해 주세요." };
  const keys = new Set(lines.slice(0, 100).map((line) => `${String(line.productId)}:${line.onePlusOne ? "1" : "0"}`));
  const cart = await getCart();
  const next = cart.filter((line) => !keys.has(`${line.productId}:${line.onePlusOne ? "1" : "0"}`));
  const removed = cart.length - next.length;
  if (!removed) return { error: "삭제할 장바구니 상품을 찾지 못했습니다." };
  await setCart(next);
  await setSelectedCoupon("");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true, removed, message: `${removed}개 상품이 장바구니에서 삭제되었습니다.` };
}

export async function applyCoupon(code: string) {
  const session = await requireUser();
  const cart = await getCart();
  const products = await prisma.product.findMany({ where: { id: { in: cart.map(line => line.productId) } } });
  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId && item.isPublished);
    return product ? [{ productId: product.id, categoryId: product.categoryId, amount: product.price * line.quantity, quantity: line.quantity }] : [];
  });
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() }, include: { issues: true } });
  const discount = coupon ? couponDiscountForLines(coupon, lines, new Date(), session?.user.id) : null;
  if (discount === null) return { error: "쿠폰의 구매 수량·금액 또는 사용 조건을 확인해 주세요." };
  return { ok: true, discount, code: coupon!.code, name: coupon!.name };
}

export async function selectCartCoupon(code: string) {
  if (code) {
    const result = await applyCoupon(code);
    if (result.error) return result;
  }
  await setSelectedCoupon(code.trim().toUpperCase());
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function createPendingOrder(formData: FormData) {
  const session = await requireUser();
  if (!session) return { error: "로그인이 필요합니다." };
  const cart = await getCart();
  if (!cart.length) return { error: "장바구니가 비어 있습니다." };

  const products = await prisma.product.findMany({
    where: { id: { in: cart.map((line) => line.productId) } },
  });
  const items = cart
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      return { product, quantity: line.quantity, onePlusOne: !!line.onePlusOne };
    })
    .filter((row): row is { product: (typeof products)[number]; quantity: number; onePlusOne: boolean } => !!row);

  if (items.length !== cart.length || items.some(row => !row.product.isPublished || (row.onePlusOne && !row.product.onePlusOne))) return { error: "구매할 수 없는 상품 옵션이 있습니다. 장바구니를 확인해 주세요." };
  for (const product of products) {
    const count = items.filter(row => row.product.id === product.id).reduce((sum, row) => sum + row.quantity * (row.onePlusOne ? 2 : 1), 0);
    if (count > product.stock) return { error: "증정품을 포함한 재고가 부족합니다." };
  }
  const subtotal = items.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const couponCode = String(formData.get("couponCode") ?? await getSelectedCoupon()).trim().toUpperCase();
  let discount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode }, include: { issues: true } });
    const applied = coupon ? couponDiscountForLines(coupon, items.map((row) => ({
      productId: row.product.id,
      categoryId: row.product.categoryId,
      amount: row.product.price * row.quantity,
      quantity: row.quantity,
    })), new Date(), session.user.id) : null;
    if (applied === null) return { error: "쿠폰의 구매 수량·금액 또는 사용 조건을 확인해 주세요." };
    discount = applied;
  }

  const payload = {
    status: ORDER_STATUS.PENDING,
    totalAmount: Math.max(subtotal - discount, 0),
    discountAmount: discount,
    receiverName: String(formData.get("receiverName") ?? "").trim(),
    receiverPhone: normalizePhone(String(formData.get("receiverPhone") ?? "")),
    zipCode: String(formData.get("zipCode") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    addressDetail: String(formData.get("addressDetail") ?? "").trim(),
    memo: String(formData.get("memo") ?? "").trim(),
    couponCode: couponCode || null,
    tossOrderId: `toss_${Date.now()}`,
    items: {
      create: items.map((row) => ({
        productId: row.product.id,
        name: row.product.name,
        price: row.product.price,
        quantity: row.quantity,
        freeQuantity: row.onePlusOne ? row.quantity : 0,
        imageUrl: row.product.imageUrl,
      })),
    },
  };

  const existing = await prisma.order.findFirst({
    where: { userId: session.user.id, status: ORDER_STATUS.PENDING },
    orderBy: { createdAt: "desc" },
  });

  const order = existing
    ? await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
        return tx.order.update({
          where: { id: existing.id },
          data: payload,
        });
      })
    : await prisma.order.create({
        data: {
          orderNumber: createOrderNumber(),
          userId: session.user.id,
          ...payload,
        },
      });

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    tossOrderId: order.tossOrderId,
    amount: order.totalAmount,
  };
}

export async function completeDemoPayment(orderId: string) {
  const session = await requireUser();
  if (!session) return { error: "로그인이 필요합니다." };
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
  });
  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (order.status === ORDER_STATUS.PAID) return { ok: true };
  if (order.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: order.couponCode }, select: { isActive: true, isPaused: true } });
    if (!coupon?.isActive || coupon.isPaused) return { error: "일시중지되었거나 사용할 수 없는 쿠폰입니다." };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: { status: ORDER_STATUS.PAID, paymentMethod: "DEMO" },
  });
  if (order.couponCode) {
    await prisma.coupon.updateMany({
      where: { code: order.couponCode },
      data: { usedCount: { increment: 1 } },
    });
  }
  await setCart([]);
  revalidatePath("/mypage/orders");
  return { ok: true };
}

export async function updateOrderStatus(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  await prisma.order.update({ where: { id }, data: { status } });
  await setAdminFlash("주문 상태가 수정되었습니다.");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function cancelOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const admin = await requireAdmin();
  const session = await requireUser();
  if (!admin && !session) return;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return;
  if (!admin && order.userId !== session?.user.id) return;
  await prisma.order.update({
    where: { id },
    data: { status: ORDER_STATUS.CANCELLED },
  });
  if (admin) await setAdminFlash("주문이 취소되었습니다.");
  revalidatePath("/admin/orders");
  revalidatePath("/mypage/orders");
}
