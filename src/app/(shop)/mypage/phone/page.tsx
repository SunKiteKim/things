import { redirect } from "next/navigation";
import { completeGooglePhone } from "@/actions/members";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GooglePhonePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireUser();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { provider: true, phone: true },
  });
  if (!user) redirect("/login");
  if (user.provider === "credentials" || user.phone) redirect("/mypage");
  const params = await searchParams;

  return (
    <section className="max-w-xl">
      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">One more step</p>
      <h1 className="display mt-2 text-4xl">휴대전화 번호 등록</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Google 계정 가입을 완료하려면 휴대전화 번호가 필요합니다. 등록한 번호는 본인 확인과
        ID/PW 찾기에 사용됩니다.
      </p>
      <form action={completeGooglePhone} className="mt-8 space-y-4">
        <input className="field" name="phone" type="tel" placeholder="010-0000-0000" autoComplete="tel" inputMode="tel" required />
        {params.error ? <p className="text-sm text-accent" role="alert">올바른 휴대전화 번호를 입력해 주세요.</p> : null}
        <button className="btn w-full">등록하고 계속하기</button>
      </form>
    </section>
  );
}
