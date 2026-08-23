"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/utils";
import { requireAdmin } from "@/lib/auth";
import { getEmailFormatError, getPasswordError } from "@/lib/signup";

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
