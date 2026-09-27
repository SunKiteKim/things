import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";

loadEnvConfig(process.cwd());
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { findMemberIds, recoverMember, resetMemberPasswordByIdentity } = await import("../src/lib/member-recovery");
  const { authOptions } = await import("../src/lib/auth");
  const ids: string[] = [];
  const initialHash = await hash("BeforeRecovery123!", 12);
  try {
    const user = await prisma.user.create({ data: { email: "recovery-test-" + randomBytes(8).toString("hex") + "@example.test", name: "Recovery test", phone: "010-1234-5678", role: "MEMBER", passwordHash: initialHash } });
    ids.push(user.id);
    async function issue(expiresAt = new Date(Date.now() + 60000)) {
      const code = randomBytes(32).toString("hex");
      await prisma.memberRecoveryCode.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(code).digest("hex"), expiresAt } });
      return code;
    }
    assert.ok((await recoverMember({ code: "invalid", mode: "account" })).error);
    assert.ok((await recoverMember({ code: randomBytes(32).toString("hex"), mode: "account" })).error);
    assert.ok((await recoverMember({ code: await issue(new Date(Date.now() - 1000)), mode: "account" })).error);
    const accountCode = await issue();
    assert.equal((await recoverMember({ code: accountCode, mode: "account" })).email, user.email);
    assert.ok((await recoverMember({ code: accountCode, mode: "account" })).error);
    const code = await issue();
    assert.ok((await recoverMember({ code, mode: "password", password: "short", confirm: "short" })).error);
    assert.ok((await recoverMember({ code, mode: "password", password: "AfterRecovery123!", confirm: "mismatch" })).error);
    const otherCode = await issue();
    const results = await Promise.all([1,2].map(() => recoverMember({ code, mode: "password", password: "AfterRecovery123!", confirm: "AfterRecovery123!" })));
    assert.equal(results.filter(r => r.reset).length, 1);
    assert.equal(results.filter(r => r.error).length, 1);
    assert.ok((await recoverMember({ code: otherCode, mode: "account" })).error);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.ok(await compare("AfterRecovery123!", updated.passwordHash!));
    assert.equal(await compare("BeforeRecovery123!", updated.passwordHash!), false);
    const callback = authOptions.callbacks!.jwt!;
    const oldToken = { id: user.id, role: "MEMBER", portal: "shop", passwordVersion: createHash("sha256").update(initialHash).digest("hex") };
    const revoked = await callback({ token: oldToken } as Parameters<typeof callback>[0]);
    assert.equal(revoked.role, "REVOKED");
    const newToken = { id: user.id, role: "MEMBER", portal: "shop", passwordVersion: createHash("sha256").update(updated.passwordHash!).digest("hex") };
    const valid = await callback({ token: newToken } as Parameters<typeof callback>[0]);
    assert.equal(valid.role, "MEMBER");
    assert.deepEqual((await findMemberIds({ name: "Recovery test", phone: "01012345678" })).emails, [user.email]);
    assert.ok((await findMemberIds({ name: "Recovery test", phone: "010-0000-0000" })).error);
    assert.ok((await resetMemberPasswordByIdentity({ email: user.email, name: "Wrong name", phone: "01012345678", password: "IdentityReset123!", confirm: "IdentityReset123!" })).error);
    assert.ok((await resetMemberPasswordByIdentity({ email: user.email, name: "Recovery test", phone: "01012345678", password: "IdentityReset123!", confirm: "mismatch" })).error);
    assert.equal((await resetMemberPasswordByIdentity({ email: user.email, name: "Recovery test", phone: "01012345678", password: "IdentityReset123!", confirm: "IdentityReset123!" })).reset, true);
    const identityUpdated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.ok(await compare("IdentityReset123!", identityUpdated.passwordHash!));
    const identityRevoked = await callback({ token: newToken } as Parameters<typeof callback>[0]);
    assert.equal(identityRevoked.role, "REVOKED");
    const socialCode = await issue();
    await prisma.user.update({ where: { id: user.id }, data: { provider: "google", passwordHash: null } });
    assert.ok((await recoverMember({ code: socialCode, mode: "password", password: "SocialReset123!", confirm: "SocialReset123!" })).error);
    assert.equal((await recoverMember({ code: socialCode, mode: "account" })).email, user.email);
    const socialToken = await callback({ token: { id: user.id, role: "MEMBER", portal: "shop", passwordVersion: "oauth" } } as Parameters<typeof callback>[0]);
    assert.equal(socialToken.role, "MEMBER");
    const { recoverAdmin } = await import("../src/lib/admin-recovery");
    const memberOnlyCode = await issue();
    assert.ok((await recoverAdmin({ code: memberOnlyCode, mode: "account" })).error);
    const adminOnlyCode = randomBytes(32).toString("hex");
    await prisma.adminRecoveryCode.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(adminOnlyCode).digest("hex"), expiresAt: new Date(Date.now() + 60000) } });
    assert.ok((await recoverMember({ code: adminOnlyCode, mode: "account" })).error);
    const memberCode = await issue();
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    assert.ok((await recoverMember({ code: memberCode, mode: "account" })).error);
    console.log("PASS: identity ID/PW recovery, phone normalization, invalid/expired codes, reuse, password validation, concurrent use, session revocation, role restriction");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
