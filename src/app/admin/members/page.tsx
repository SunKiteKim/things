import { prisma } from "@/lib/prisma";
import { createMember, deleteMember } from "@/actions/members";
import { LIMITS, formatDate, maskEmail, maskPersonalInfo, maskPhone } from "@/lib/utils";
import { AdminCreateModal } from "@/components/admin-create-modal";
import { RequiredMark } from "@/components/required-mark";
import { AdminMasterDetail } from "@/components/admin-master-detail";
import { MemberForm } from "@/components/member-form";
import { memberMids } from "@/lib/member-code";

const ROLE_LABEL: Record<string, string> = {
  MEMBER: "회원",
  ADMIN: "관리자",
  WITHDRAWN: "탈퇴",
};

export default async function MembersAdminPage() {
  const members = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const count = members.filter((user) => user.role === "MEMBER").length;
  const midById = memberMids(members);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div><h1 className="display text-3xl">회원관리</h1><p className="mt-2 text-sm text-muted">{count} / {LIMITS.MAX_MEMBERS}명</p></div>
        <AdminCreateModal title="회원 등록" triggerLabel="회원 등록" action={createMember}>
          <label className="text-sm font-medium">이름<RequiredMark /><input className="field mt-2" name="name" required /></label>
          <label className="text-sm font-medium">이메일<RequiredMark /><input className="field mt-2" name="email" type="email" required /></label>
          <label className="text-sm font-medium">휴대폰<input className="field mt-2" name="phone" /></label>
          <label className="text-sm font-medium">임시 비밀번호<RequiredMark /><input className="field mt-2" name="password" type="password" required /></label>
        </AdminCreateModal>
      </div>
      <AdminMasterDetail
        listTitle="회원 목록"
        detailTitle="회원 상세"
        columns={[{ label: "이메일", sortKey: "email" }, { label: "이름", sortKey: "name" }, "UID", "휴대폰", { label: "가입일", sortKey: "createdAt" }, { label: "역할", sortKey: "role" }]}
        search={{ placeholder: "이메일, 이름, 휴대폰", fields: [{ value: "email", label: "이메일" }, { value: "name", label: "이름" }, { value: "phone", label: "휴대폰" }] }}
        filters={[{ key: "role", label: "역할", options: [{ value: "MEMBER", label: "회원" }, { value: "ADMIN", label: "관리자" }, { value: "WITHDRAWN", label: "탈퇴" }] }]}
        rows={members.map((user) => ({
          id: user.id,
          searchText: `${user.email} ${user.name} ${user.phone ?? ""} ${(user.phone ?? "").replace(/\D/g, "")}`,
          searchFields: { email: user.email, name: user.name, phone: `${user.phone ?? ""} ${(user.phone ?? "").replace(/\D/g, "")}` },
          facets: { role: user.role },
          sortValues: { email: user.email, name: user.name, createdAt: user.createdAt.getTime(), role: ROLE_LABEL[user.role] ?? user.role },
          cells: [maskEmail(user.email), maskPersonalInfo(user.name), maskPersonalInfo(user.id), maskPhone(user.phone), formatDate(user.createdAt), ROLE_LABEL[user.role] ?? user.role],
          detail: <div><MemberForm user={{ id: user.id, mid: midById.get(user.id) ?? "-", name: maskPersonalInfo(user.name), email: maskEmail(user.email), phone: maskPhone(user.phone), zipCode: maskPersonalInfo(user.zipCode), address: maskPersonalInfo(user.address), addressDetail: maskPersonalInfo(user.addressDetail), role: user.role, createdAt: user.createdAt, updatedAt: user.updatedAt }} />{user.role !== "ADMIN" ? <form action={deleteMember} className="mt-4 max-w-3xl border-t border-line pt-4"><input type="hidden" name="id" value={user.id} /><button className="btn btn-ghost">회원 삭제</button></form> : null}</div>,
        }))}
      />
    </div>
  );
}
