import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";

loadEnvConfig(process.cwd());
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { recoverAdmin } = await import("../src/lib/admin-recovery");
  const { authOptions } = await import("../src/lib/auth");
  const ids: string[] = [];
  const initialHash = await hash("BeforeRecovery123!", 12);
  try {
    const user = await prisma.user.create({ data: { email: "recovery-test-" + randomBytes(8).toString("hex") + "@example.test", name: "Recovery test", role: "ADMIN", passwordHash: initialHash } });
    ids.push(user.id);
    async function issue(expiresAt = new Date(Date.now() + 60000)) {
      const code = randomBytes(32).toString("hex");
      await prisma.adminRecoveryCode.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(code).digest("hex"), expiresAt } });
      return code;
    }
    assert.ok((await recoverAdmin({ code: "invalid", mode: "account" })).error);
    assert.ok((await recoverAdmin({ code: randomBytes(32).toString("hex"), mode: "account" })).error);
    assert.ok((await recoverAdmin({ code: await issue(new Date(Date.now() - 1000)), mode: "account" })).error);
    const accountCode = await issue();
    assert.equal((await recoverAdmin({ code: accountCode, mode: "account" })).email, user.email);
    assert.ok((await recoverAdmin({ code: accountCode, mode: "account" })).error);
    const code = await issue();
    assert.ok((await recoverAdmin({ code, mode: "password", password: "short", confirm: "short" })).error);
    assert.ok((await recoverAdmin({ code, mode: "password", password: "AfterRecovery123!", confirm: "mismatch" })).error);
    const otherCode = await issue();
    const results = await Promise.all([1,2].map(() => recoverAdmin({ code, mode: "password", password: "AfterRecovery123!", confirm: "AfterRecovery123!" })));
    assert.equal(results.filter(r => r.reset).length, 1);
    assert.equal(results.filter(r => r.error).length, 1);
    assert.ok((await recoverAdmin({ code: otherCode, mode: "account" })).error);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.ok(await compare("AfterRecovery123!", updated.passwordHash!));
    assert.equal(await compare("BeforeRecovery123!", updated.passwordHash!), false);
    const callback = authOptions.callbacks!.jwt!;
    const oldToken = { id: user.id, role: "ADMIN", portal: "admin", passwordVersion: createHash("sha256").update(initialHash).digest("hex") };
    const revoked = await callback({ token: oldToken } as Parameters<typeof callback>[0]);
    assert.equal(revoked.role, "REVOKED");
    const newToken = { id: user.id, role: "ADMIN", portal: "admin", passwordVersion: createHash("sha256").update(updated.passwordHash!).digest("hex") };
    const valid = await callback({ token: newToken } as Parameters<typeof callback>[0]);
    assert.equal(valid.role, "ADMIN");
    const memberCode = await issue();
    await prisma.user.update({ where: { id: user.id }, data: { role: "MEMBER" } });
    assert.ok((await recoverAdmin({ code: memberCode, mode: "account" })).error);
    console.log("PASS: invalid/expired codes, account lookup, reuse, password validation, concurrent use, sibling invalidation, password verification, session revocation, role restriction");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
