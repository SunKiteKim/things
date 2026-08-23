import Link from "next/link";
import type { ReactNode } from "react";

type QuickItem = {
  href: string;
  label: string;
  icon: "object" | "light" | "table" | "textile" | "scent" | "event" | "coupon" | "account";
};

const ICONS: Record<QuickItem["icon"], ReactNode> = {
  object: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z" />
      <path d="M12 12 20 8M12 12v9M12 12 4 8" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 18h6M10 21h4" />
      <path d="M8 10a4 4 0 1 1 8 0c0 2.2-1.3 3.4-2 5H10c-.7-1.6-2-2.8-2-5Z" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 8h16M6 8v10M18 8v10M4 12h16" />
    </svg>
  ),
  textile: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 6h14v12H5z" />
      <path d="M5 10h14M9 6v12" />
    </svg>
  ),
  scent: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 21h6l1-9H8l1 9Z" />
      <path d="M12 12c0-3 2-4 2-7" />
    </svg>
  ),
  event: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  ),
  coupon: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2V8Z" />
      <path d="M12 8v8" strokeDasharray="2 2" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19" />
    </svg>
  ),
};

export function QuickMenu({ items }: { items: QuickItem[] }) {
  return (
    <nav className="grid grid-cols-4 gap-y-6 sm:grid-cols-8">
      {items.map((item) => (
        <Link key={item.label} href={item.href} className="group flex flex-col items-center gap-2.5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-paper transition group-hover:bg-accent">
            {ICONS[item.icon]}
          </span>
          <span className="text-[0.8rem] font-normal">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
