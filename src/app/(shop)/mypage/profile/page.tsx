import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "@/actions/members";
import { FormField } from "@/components/form-field";
import { PostcodeAddress } from "@/components/postcode-address";

export default async function MyProfilePage() {
  const session = await requireUser();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="display text-5xl">회원정보</h1>
      <p className="mt-3 text-sm text-muted">
        {user.email} · {user.provider === "credentials" ? "일반 가입" : `${user.provider} 연동`}
      </p>
      <form action={updateProfile} className="mt-10 max-w-xl grid gap-5">
        <FormField label="이름" htmlFor="profile-name">
          <input id="profile-name" className="field" name="name" defaultValue={user.name} />
        </FormField>
        <FormField label="이메일">
          <input className="field bg-surface" value={user.email} readOnly />
        </FormField>
        <FormField label="휴대폰" htmlFor="profile-phone">
          <input id="profile-phone" className="field" name="phone" defaultValue={user.phone ?? ""} />
        </FormField>
        <PostcodeAddress
          zipCode={user.zipCode ?? ""}
          address={user.address ?? ""}
          addressDetail={user.addressDetail ?? ""}
        />
        <div className="form-row">
          <span />
          <button className="btn w-fit">저장</button>
        </div>
      </form>
    </div>
  );
}
