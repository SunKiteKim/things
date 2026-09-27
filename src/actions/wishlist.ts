"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleWishlist(productId: string) {
  const session = await requireUser();
  if (!session) return { error: "로그인 후 위시리스트를 이용해 주세요." };
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, isPublished: true } });
  if (!product?.isPublished) return { error: "현재 위시리스트에 추가할 수 없는 상품입니다." };
  const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: session.user.id, productId } } });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/mypage");
    return { ok: true, added: false, message: "위시리스트에서 삭제되었습니다." };
  }
  await prisma.wishlistItem.create({ data: { userId: session.user.id, productId } });
  revalidatePath("/mypage");
  return { ok: true, added: true, message: "위시리스트에 추가되었습니다." };
}

export async function removeWishlistItem(productId: string) {
  const session = await requireUser();
  if (!session) return { error: "로그인이 필요합니다." };
  await prisma.wishlistItem.deleteMany({ where: { userId: session.user.id, productId } });
  revalidatePath("/mypage");
  return { ok: true, message: "위시리스트에서 삭제되었습니다." };
}
