"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/utils";
import { getEmailFormatError, getPasswordConfirmError, getPasswordError } from "@/lib/signup";

export async function checkSignupEmail(email: string) {
  const formatError = getEmailFormatError(email);
  if (formatError) return { ok: false as const, message: formatError };
  // Do not reveal whether an account exists before signup is submitted.
  return { ok: true as const, message: "이메일 형식을 확인했습니다." };
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
  if (exists) redirect("/signup?error=invalid");

  await prisma.user.create({
    data: {
      email,
      name,
      phone: phone || null,
      zipCode: zipCode || null,
      address: address || null,
      addressDetail: addressDetail || null,
      passwordHash: await hash(password, 12),
      provider: "credentials",
      role: "MEMBER",
    },
  });

  redirect("/login?registered=1");
}
