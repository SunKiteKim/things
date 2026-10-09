"use client";

import { SubmitButton } from "@/components/submit-button";

import { updateMember } from "@/actions/members";
import { DisabledText } from "@/components/disabled-text";
import { formatDateTime } from "@/lib/utils";

type MaskedMember = {
  id: string;
  mid: string;
  name: string;
  email: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="admin-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function MemberForm({ user }: { user: MaskedMember }) {
  return (
    <form action={updateMember} className="mt-8 grid max-w-3xl gap-5">
      <input type="hidden" name="id" value={user.id} />
      <Field label="UID">
        <DisabledText>{user.id}</DisabledText>
      </Field>
      <Field label="MID">
        <DisabledText>{user.mid}</DisabledText>
      </Field>
      <Field label="이름">
        <DisabledText>{user.name}</DisabledText>
      </Field>
      <Field label="이메일">
        <DisabledText>{user.email}</DisabledText>
      </Field>
      <Field label="휴대폰">
        <DisabledText>{user.phone}</DisabledText>
      </Field>
      <Field label="역할">
        <select className="field" name="role" defaultValue={user.role}>
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </Field>
      <Field label="우편번호">
        <DisabledText>{user.zipCode}</DisabledText>
      </Field>
      <Field label="주소">
        <DisabledText>{user.address}</DisabledText>
      </Field>
      <Field label="상세주소">
        <DisabledText>{user.addressDetail}</DisabledText>
      </Field>
      <Field label="비밀번호">
        <input className="field" name="password" type="password" placeholder="변경 시에만 입력" />
      </Field>
      <Field label="가입일">
        <DisabledText>{formatDateTime(user.createdAt)}</DisabledText>
      </Field>
      <Field label="수정일">
        <DisabledText>{formatDateTime(user.updatedAt)}</DisabledText>
      </Field>
      <div className="admin-row">
        <span />
        <SubmitButton className="btn w-fit">회원 수정</SubmitButton>
      </div>
    </form>
  );
}
