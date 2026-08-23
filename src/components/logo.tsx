import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string | null;
};

export function Logo({ className, href = "/" }: LogoProps) {
  const mark = (
    <span className={cn("logo-type leading-none", className)}>things</span>
  );
  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-baseline">
      {mark}
    </Link>
  );
}
