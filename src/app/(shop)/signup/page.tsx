import { SignupForm } from "@/components/signup-form";
import { LIMITS } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  invalid: "이름, 이메일, 비밀번호를 확인하세요.",
  exists: "이미 가입된 이메일입니다.",
  limit: `회원 가입은 최대 ${LIMITS.MAX_MEMBERS}명까지 가능합니다.`,
  email: "소셜 계정에서 이메일을 확인할 수 없습니다.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted">Join</p>
      <h1 className="display mt-3 text-5xl">회원가입</h1>
      <p className="mt-3 text-sm text-muted">
        포트폴리오 한도는 {LIMITS.MAX_MEMBERS}명입니다.
      </p>
      {error ? <p className="mt-4 text-sm text-accent">{ERRORS[error] ?? error}</p> : null}
      <SignupForm />
    </div>
  );
}
