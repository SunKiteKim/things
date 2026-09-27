import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MemberForm } from "@/components/member-form";
import { maskPersonalInfo } from "@/lib/utils";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/members" className="text-muted hover:text-ink">
          회원관리
        </Link>
      </p>
      <h1 className="display mt-3 text-4xl">회원 수정</h1>
      <MemberForm
        user={{
          id: user.id,
          name: maskPersonalInfo(user.name),
          email: maskPersonalInfo(user.email),
          phone: maskPersonalInfo(user.phone),
          zipCode: maskPersonalInfo(user.zipCode),
          address: maskPersonalInfo(user.address),
          addressDetail: maskPersonalInfo(user.addressDetail),
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }}
      />
    </div>
  );
}
