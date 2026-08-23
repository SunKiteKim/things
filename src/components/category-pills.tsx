import Link from "next/link";
import { cn } from "@/lib/utils";

type CategoryItem = {
  slug: string;
  name: string;
};

export function CategoryPills({
  categories,
  activeSlug,
}: {
  categories: CategoryItem[];
  activeSlug?: string | null;
}) {
  const items = [{ slug: "", name: "All" }, ...categories];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const href = item.slug ? `/products?category=${item.slug}` : "/products";
        const active = (activeSlug ?? "") === item.slug;
        return (
          <Link
            key={item.slug || "all"}
            href={href}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-4 text-[0.82rem]",
              active
                ? "border-ink bg-ink !text-[#d8d4cc]"
                : "border-line bg-paper text-ink hover:border-ink",
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
