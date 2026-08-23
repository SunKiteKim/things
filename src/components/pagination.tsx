import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="mt-16 flex items-center justify-center gap-2" aria-label="페이지">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="border border-line px-3 py-2 text-sm hover:border-ink">
          이전
        </Link>
      ) : (
        <span className="border border-line px-3 py-2 text-sm text-muted">이전</span>
      )}
      {pages.map((item) => (
        <Link
          key={item}
          href={hrefFor(item)}
          className={cn(
            "min-w-10 px-3 py-2 text-center text-sm",
            item === page ? "bg-ink text-paper" : "border border-line hover:border-ink",
          )}
        >
          {item}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="border border-line px-3 py-2 text-sm hover:border-ink">
          다음
        </Link>
      ) : (
        <span className="border border-line px-3 py-2 text-sm text-muted">다음</span>
      )}
    </nav>
  );
}
