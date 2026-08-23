import { ShopFooter, ShopHeader } from "@/components/shop-chrome";
import { ShopMain } from "@/components/shop-main";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopHeader />
      <ShopMain>{children}</ShopMain>
      <ShopFooter />
    </>
  );
}
