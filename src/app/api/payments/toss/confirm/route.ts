import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS } from "@/lib/utils";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    paymentKey?: string;
    orderId?: string;
    amount?: number;
  } | null;

  if (!body || typeof body.orderId !== "string" || typeof body.amount !== "number") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      userId: session.user.id,
      OR: [{ id: body.orderId }, { tossOrderId: body.orderId }],
    },
  });

  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  if (order.totalAmount !== body.amount) {
    return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
  }

  const secret = process.env.TOSS_SECRET_KEY;
  if (secret && body.paymentKey) {
    const confirm = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      }),
    });
    if (!confirm.ok) {
      return NextResponse.json({ error: "toss confirm failed" }, { status: 400 });
    }
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: ORDER_STATUS.PAID,
      paymentKey: body.paymentKey ?? null,
      paymentMethod: "TOSS",
    },
  });

  if (order.couponCode) {
    await prisma.coupon.updateMany({
      where: { code: order.couponCode },
      data: { usedCount: { increment: 1 } },
    });
  }

  const response = NextResponse.json({ ok: true, orderId: order.id });
  response.cookies.set("things_cart", "[]", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
