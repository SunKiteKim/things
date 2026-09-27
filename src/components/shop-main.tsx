"use client";

import { usePathname } from "next/navigation";

export function ShopMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isLogin = pathname === "/login";
  return (
    <main
      className={
        isHome
          ? "min-h-[70vh]"
          : isLogin
            ? "mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-[1280px] items-center justify-center px-5 py-12 md:px-8"
          : "mx-auto min-h-[70vh] w-full max-w-[1280px] px-5 py-10 md:px-8"
      }
    >
      {children}
    </main>
  );
}
