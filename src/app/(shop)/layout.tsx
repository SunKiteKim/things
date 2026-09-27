import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShopFooter, ShopHeader } from "@/components/shop-chrome";
import { ShopMain } from "@/components/shop-main";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const shopUser = session?.user && session.user.portal !== "admin" && session.user.role === "MEMBER";

  if (shopUser && pathname !== "/mypage/phone") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { provider: true, phone: true },
    });
    if (user && user.provider !== "credentials" && !user.phone) {
      redirect("/mypage/phone");
    }
  }

  return (
    <>
      <ShopHeader />
      <ShopMain>{children}</ShopMain>
      <ShopFooter />
    </>
  );
}
