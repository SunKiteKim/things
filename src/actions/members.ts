"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import { getEmailFormatError, getPasswordError } from "@/lib/signup";
import { normalizePhone } from "@/lib/member-recovery";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createMember(formData: FormData) {
  if (!(await requireAdmin())) return;
  const count = await prisma.user.count({ where: { role: "MEMBER" } });
  if (count >= LIMITS.MAX_MEMBERS) {
    return;
  }
  const email = text(formData, "email").toLowerCase();
  const name = text(formData, "name");
  const password = text(formData, "password");
  const phone = text(formData, "phone");
  if (!name || getEmailFormatError(email) || getPasswordError(password)) return;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;
  await prisma.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      passwordHash: await hash(password, 12),
      role: "MEMBER",
      provider: "credentials",
    },
  });
  revalidatePath("/admin/members");
  return;
}

export async function updateMember(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const role = text(formData, "role") || "MEMBER";
  const password = text(formData, "password");
  if (!id || !name) return;
  await prisma.user.update({
    where: { id },
    data: {
      name,
      phone: phone || null,
      role,
      zipCode: text(formData, "zipCode") || null,
      address: text(formData, "address") || null,
      addressDetail: text(formData, "addressDetail") || null,
      ...(password && !getPasswordError(password) ? { passwordHash: await hash(password, 12) } : {}),
    },
  });
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return;
}

export async function deleteMember(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = text(formData, "id");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  if (user.role === "ADMIN") return;
  await prisma.order.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/members");
  return;
}

export async function updateProfile(formData: FormData) {
  const session = await (await import("@/lib/auth")).requireUser();
  if (!session) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: text(formData, "name") || session.user.name || "회원",
      phone: text(formData, "phone") || null,
      zipCode: text(formData, "zipCode") || null,
      address: text(formData, "address") || null,
      addressDetail: text(formData, "addressDetail") || null,
    },
  });
  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  return;
}

export async function completeGooglePhone(formData: FormData) {
  const session = await (await import("@/lib/auth")).requireUser();
  if (!session) redirect("/login");
  const phone = text(formData, "phone");
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
    redirect("/mypage/phone?error=invalid");
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  if (user.provider === "credentials") redirect("/mypage");
  await prisma.user.update({
    where: { id: user.id },
    data: { phone: normalizedPhone },
  });
  revalidatePath("/", "layout");
  redirect("/mypage");
}

export async function withdrawMember(input: { email: string; phone: string }) {
  const session = await (await import("@/lib/auth")).requireUser();
  if (!session) return { ok: false as const, error: "로그인 상태를 확인해 주세요." };
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  if (!email || phone.length < 9 || phone.length > 15) {
    return { ok: false as const, error: "ID와 휴대전화 번호를 모두 정확히 입력해 주세요." };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "MEMBER" || user.email.toLowerCase() !== email || normalizePhone(user.phone ?? "") !== phone) {
    return { ok: false as const, error: "입력한 정보가 현재 회원정보와 일치하지 않습니다." };
  }

  await prisma.$transaction(async (tx) => {
    const withdrawnAt = new Date();
    await tx.adminRecoveryCode.deleteMany({ where: { userId: user.id } });
    await tx.memberRecoveryCode.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: `withdrawn-${user.id}@deleted.invalid`,
        name: "탈퇴 회원",
        phone: null,
        passwordHash: null,
        provider: "withdrawn",
        providerId: null,
        role: "WITHDRAWN",
        zipCode: null,
        address: null,
        addressDetail: `withdrawn:${withdrawnAt.toISOString()}`,
      },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
