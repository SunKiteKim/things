"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCart, setCart, type CartLine } from "@/lib/cart";
import { ORDER_STATUS, createOrderNumber } from "@/lib/utils";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function buyNow(productId: string, quantity = 1) {
  const result = await addToCart(productId, quantity);
  if (result && "error" in result && result.error) return result;
  redirect("/checkout");
}

export async function addToCart(productId: string, quantity = 1) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isPublished) return { error: "상품을 찾을 수 없습니다." };
  const cart = await getCart();
  const existing = cart.find((line) => line.productId === productId);
  const qty = Math.max(1, quantity);
  if (existing) existing.quantity = Math.min(product.stock, existing.quantity + qty);
  else cart.push({ productId, quantity: Math.min(product.stock, qty) });
  await setCart(cart);
  revalidatePath("/cart");
  return { ok: true };
}

export async function updateCartLine(productId: string, quantity: number) {
  const cart = await getCart();
  const next: CartLine[] =
    quantity <= 0
      ? cart.filter((line) => line.productId !== productId)
      : cart.map((line) =>
          line.productId === productId ? { ...line, quantity } : line,
        );
  await setCart(next);
  revalidatePath("/cart");
  return { ok: true };
}

export async function clearCart() {
  await setCart([]);
  revalidatePath("/cart");
}

export async function applyCoupon(code: string, amount: number) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  const now = new Date();
  if (
    !coupon ||
    !coupon.isActive ||
    coupon.startAt > now ||
    coupon.endAt < now ||
    (coupon.maxUses && coupon.usedCount >= coupon.maxUses) ||
    amount < coupon.minOrderAmount
  ) {
    return { error: "사용할 수 없는 쿠폰입니다." };
  }
  const discount =
    coupon.discountType === "PERCENT"
      ? Math.floor((amount * coupon.discountValue) / 100)
      : coupon.discountValue;
  return { ok: true, discount, code: coupon.code, name: coupon.name };
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
      return { product, quantity: line.quantity };
    })
    .filter((row): row is { product: (typeof products)[number]; quantity: number } => !!row);

  const subtotal = items.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const couponCode = String(formData.get("couponCode") ?? "").trim().toUpperCase();
  let discount = 0;
  if (couponCode) {
    const applied = await applyCoupon(couponCode, subtotal);
    if ("discount" in applied && applied.discount) discount = applied.discount;
  }

  const payload = {
    status: ORDER_STATUS.PENDING,
    totalAmount: Math.max(subtotal - discount, 0),
    discountAmount: discount,
    receiverName: String(formData.get("receiverName") ?? "").trim(),
    receiverPhone: String(formData.get("receiverPhone") ?? "").trim(),
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
  revalidatePath("/admin/orders");
  revalidatePath("/mypage/orders");
}
