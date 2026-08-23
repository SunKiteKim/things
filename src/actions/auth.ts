"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/utils";
import { getEmailFormatError, getPasswordConfirmError, getPasswordError } from "@/lib/signup";

export async function checkSignupEmail(email: string) {
  const formatError = getEmailFormatError(email);
  if (formatError) return { ok: false as const, message: formatError };
  const exists = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (exists) return { ok: false as const, message: "이미 가입된 이메일입니다." };
  return { ok: true as const, message: "사용 가능한 이메일입니다." };
}

export async function checkSignupPassword(password: string, confirm: string) {
  return {
    password: getPasswordError(password),
    confirm: getPasswordConfirmError(password, confirm),
  };
}

export async function registerMember(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const addressDetail = String(formData.get("addressDetail") ?? "").trim();

  if (!name || getEmailFormatError(email) || getPasswordError(password) || getPasswordConfirmError(password, passwordConfirm)) {
    redirect("/signup?error=invalid");
  }

  const memberCount = await prisma.user.count({ where: { role: "MEMBER" } });
  if (memberCount >= LIMITS.MAX_MEMBERS) {
    redirect("/signup?error=limit");
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) redirect("/signup?error=exists");

  await prisma.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      zipCode: zipCode || null,
      address: address || null,
      addressDetail: addressDetail || null,
      passwordHash: await hash(password, 10),
      provider: "credentials",
      role: "MEMBER",
    },
  });

  redirect("/login?registered=1");
}
