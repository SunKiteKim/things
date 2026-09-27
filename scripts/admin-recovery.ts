import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:recovery -- admin@example.com");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN") throw new Error("관리자 계정을 찾을 수 없습니다.");
  const code = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.adminRecoveryCode.deleteMany({ where: { userId: user.id } });
    await tx.adminRecoveryCode.create({ data: {
      userId: user.id, tokenHash: createHash("sha256").update(code).digest("hex"), expiresAt,
    } });
  });
  console.log("일회용 복구 코드 (안전하게 전달하고 Git에 저장하지 마세요):");
  console.log(code);
  console.log("만료 시각:", expiresAt.toISOString());
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
