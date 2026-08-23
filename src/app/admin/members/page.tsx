import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createMember, deleteMember } from "@/actions/members";
import { LIMITS, formatDate, maskEmail, maskPhone } from "@/lib/utils";

export default async function MembersAdminPage() {
  const members = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const count = members.filter((user) => user.role === "MEMBER").length;

  return (
    <div>
      <h1 className="display text-4xl">회원관리</h1>
      <p className="mt-2 text-sm text-muted">
        {count} / {LIMITS.MAX_MEMBERS}명
      </p>
      <form action={createMember} className="mt-8 grid gap-3 border border-line bg-surface p-6 md:grid-cols-5">
        <input className="field" name="name" placeholder="이름" required />
        <input className="field" name="email" type="email" placeholder="이메일" required />
        <input className="field" name="phone" placeholder="휴대폰" />
        <input className="field" name="password" placeholder="임시 비밀번호" required />
        <button className="btn">회원 등록</button>
      </form>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-3">이름</th>
              <th>이메일</th>
              <th>휴대폰</th>
              <th>가입</th>
              <th>역할</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((user) => (
              <tr key={user.id} className="border-b border-line">
                <td className="py-4">{user.name}</td>
                <td className="py-4">
                  {maskEmail(user.email)}
                  <div className="text-xs text-muted">{user.provider}</div>
                </td>
                <td className="py-4">{maskPhone(user.phone)}</td>
                <td className="py-4">{formatDate(user.createdAt)}</td>
                <td className="py-4">{user.role}</td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <Link href={`/admin/members/${user.id}`} className="btn btn-ghost min-h-8">
                      수정
                    </Link>
                    {user.role !== "ADMIN" ? (
                      <form action={deleteMember}>
                        <input type="hidden" name="id" value={user.id} />
                        <button className="btn btn-ghost min-h-8">삭제</button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
