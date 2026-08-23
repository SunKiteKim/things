import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MemberForm } from "@/components/member-form";

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
      <MemberForm user={user} />
    </div>
  );
}
