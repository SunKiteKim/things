"use client";

import type { User } from "@prisma/client";
import { updateMember } from "@/actions/members";
import { formatDateTime } from "@/lib/utils";
import { PostcodeAddress } from "@/components/postcode-address";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function MemberForm({ user }: { user: User }) {
  return (
    <form action={updateMember} className="mt-8 grid max-w-3xl gap-5">
      <input type="hidden" name="id" value={user.id} />
      <Field label="이름">
        <input className="field" name="name" defaultValue={user.name} required />
      </Field>
      <Field label="이메일">
        <input className="field bg-surface" value={user.email} readOnly />
      </Field>
      <Field label="휴대폰">
        <input className="field" name="phone" defaultValue={user.phone ?? ""} />
      </Field>
      <Field label="역할">
        <select className="field" name="role" defaultValue={user.role}>
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </Field>
      <PostcodeAddress
        zipCode={user.zipCode ?? ""}
        address={user.address ?? ""}
        addressDetail={user.addressDetail ?? ""}
      />
      <Field label="비밀번호">
        <input className="field" name="password" type="password" placeholder="변경 시에만 입력" />
      </Field>
      <Field label="가입일">
        <input className="field bg-surface" value={formatDateTime(user.createdAt)} readOnly />
      </Field>
      <Field label="수정일">
        <input className="field bg-surface" value={formatDateTime(user.updatedAt)} readOnly />
      </Field>
      <div className="admin-row">
        <span />
        <button className="btn w-fit">회원 수정</button>
      </div>
    </form>
  );
}
