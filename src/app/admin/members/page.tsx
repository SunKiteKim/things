import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createMember, deleteMember } from "@/actions/members";
import { LIMITS, formatDate, maskEmail, maskPersonalInfo, maskPhone } from "@/lib/utils";
import { AdminCreateModal } from "@/components/admin-create-modal";

export default async function MembersAdminPage() {
  const members = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const count = members.filter((user) => user.role === "MEMBER").length;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="display text-3xl">회원관리</h1><p className="mt-2 text-sm text-muted">{count} / {LIMITS.MAX_MEMBERS}명</p></div>
        <AdminCreateModal title="회원 등록" triggerLabel="회원 등록" action={createMember}>
          <label className="text-sm font-medium">이름<input className="field mt-2" name="name" required /></label>
          <label className="text-sm font-medium">이메일<input className="field mt-2" name="email" type="email" required /></label>
          <label className="text-sm font-medium">휴대폰<input className="field mt-2" name="phone" /></label>
          <label className="text-sm font-medium">임시 비밀번호<input className="field mt-2" name="password" type="password" required /></label>
        </AdminCreateModal>
      </div>
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
                <td className="py-4">{maskPersonalInfo(user.name)}</td>
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
