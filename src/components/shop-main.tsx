"use client";

import { usePathname } from "next/navigation";

export function ShopMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <main
      className={
        isHome
          ? "min-h-[70vh]"
          : "mx-auto min-h-[70vh] w-full max-w-[1280px] px-5 py-10 md:px-8"
      }
    >
      {children}
    </main>
  );
}
