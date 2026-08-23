"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="cursor-pointer appearance-none border-0 bg-transparent p-0 text-inherit"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      로그아웃
    </button>
  );
}
