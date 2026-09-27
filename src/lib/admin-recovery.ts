import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getPasswordError } from "@/lib/signup";

export const RECOVERY_ERROR = "복구 코드가 올바르지 않거나 만료·사용되었습니다. 새 코드를 발급받으세요.";

export async function recoverAdmin(input: { code: string; mode: string; password?: string; confirm?: string }): Promise<{ error?: string; email?: string; reset?: boolean }> {
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
  const recovery = await prisma.adminRecoveryCode.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!recovery || recovery.usedAt || recovery.expiresAt <= new Date() || recovery.user.role !== "ADMIN") {
    return { error: RECOVERY_ERROR };
  }
  const passwordHash = input.mode === "password" ? await hash(input.password!, 12) : undefined;
  return prisma.$transaction(async (tx) => {
    // Claim atomically: concurrent submissions cannot reuse a code.
    const claim = await tx.adminRecoveryCode.updateMany({
      where: { id: recovery.id, usedAt: null, expiresAt: { gt: new Date() }, user: { role: "ADMIN" } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) return { error: RECOVERY_ERROR };
    if (passwordHash) {
      await tx.user.update({ where: { id: recovery.userId }, data: { passwordHash } });
      await tx.adminRecoveryCode.updateMany({ where: { userId: recovery.userId, usedAt: null }, data: { usedAt: new Date() } });
    }
    return { email: recovery.user.email, reset: Boolean(passwordHash) };
  });
}
