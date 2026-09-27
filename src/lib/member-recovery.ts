import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getPasswordError } from "@/lib/signup";

export const RECOVERY_ERROR = "복구 코드가 올바르지 않거나 만료·사용되었습니다. 새 코드를 발급받으세요.";

const MEMBER_NOT_FOUND = "입력한 정보와 일치하는 회원을 찾을 수 없습니다.";

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

async function membersWithIdentity(name: string, phone: string) {
  const normalizedName = name.trim();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedName || normalizedPhone.length < 9 || normalizedPhone.length > 15) return [];

  const candidates = await prisma.user.findMany({
    where: { name: normalizedName, role: "MEMBER", phone: { not: null } },
    select: { id: true, email: true, phone: true, provider: true, passwordHash: true },
  });
  return candidates.filter((member) => normalizePhone(member.phone ?? "") === normalizedPhone);
}

export async function findMemberIds(input: { name: string; phone: string }) {
  const members = await membersWithIdentity(input.name, input.phone);
  if (!members.length) return { error: MEMBER_NOT_FOUND };
  return { emails: members.map((member) => member.email) };
}

export async function resetMemberPasswordByIdentity(input: {
  email: string;
  name: string;
  phone: string;
  password: string;
  confirm: string;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordError = getPasswordError(input.password);
  if (passwordError) return { error: passwordError };
  if (Buffer.byteLength(input.password, "utf8") > 72) return { error: "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다." };
  if (input.password !== input.confirm) return { error: "비밀번호가 일치하지 않습니다." };

  const members = await membersWithIdentity(input.name, input.phone);
  const member = members.find((candidate) => candidate.email.toLowerCase() === email);
  if (!member) return { error: MEMBER_NOT_FOUND };
  if (member.provider !== "credentials" || !member.passwordHash) {
    return { error: "Google 가입 회원은 Google 계정에서 비밀번호를 변경해 주세요." };
  }

  await prisma.user.update({
    where: { id: member.id },
    data: { passwordHash: await hash(input.password, 12) },
  });
  return { reset: true as const };
}

export async function recoverMember(input: { code: string; mode: string; password?: string; confirm?: string }): Promise<{ error?: string; email?: string; reset?: boolean }> {
  const code = input.code.trim();
  if (!/^[a-f0-9]{64}$/.test(code)) return { error: RECOVERY_ERROR };
  if (input.mode !== "account" && input.mode !== "password") return { error: "요청을 확인하세요." };
  if (input.mode === "password") {
    const error = getPasswordError(input.password ?? "");
    if (error) return { error };
    if (Buffer.byteLength(input.password!, "utf8") > 72) return { error: "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다." };
    if (input.password !== input.confirm) return { error: "비밀번호가 일치하지 않습니다." };
  }
  const tokenHash = createHash("sha256").update(code).digest("hex");
  const recovery = await prisma.memberRecoveryCode.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!recovery || recovery.usedAt || recovery.expiresAt <= new Date() || recovery.user.role !== "MEMBER") {
    return { error: RECOVERY_ERROR };
  }
  if (input.mode === "password" && (recovery.user.provider !== "credentials" || !recovery.user.passwordHash)) {
    return { error: "소셜 로그인 계정은 가입한 Google 계정에서 비밀번호를 변경하세요." };
  }
  const passwordHash = input.mode === "password" ? await hash(input.password!, 12) : undefined;
  return prisma.$transaction(async (tx) => {
    // Claim atomically: concurrent submissions cannot reuse a code.
    const claim = await tx.memberRecoveryCode.updateMany({
      where: { id: recovery.id, usedAt: null, expiresAt: { gt: new Date() }, user: { role: "MEMBER", ...(passwordHash ? { provider: "credentials", passwordHash: { not: null } } : {}) } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) return { error: RECOVERY_ERROR };
    if (passwordHash) {
      await tx.user.update({ where: { id: recovery.userId }, data: { passwordHash } });
      await tx.memberRecoveryCode.updateMany({ where: { userId: recovery.userId, usedAt: null }, data: { usedAt: new Date() } });
    }
    return { email: recovery.user.email, reset: Boolean(passwordHash) };
  });
}
