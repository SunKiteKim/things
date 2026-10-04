import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { QuickMenu } from "@/components/quick-menu";
import { loadPageDisplay } from "@/lib/display";
import { HOME_SECTIONS } from "@/lib/display-items";
import bannerMain from "@/img/banner_main_things_1520_500.png";
import bannerCoupon from "@/img/banner_coupon_things_1380_180.png";

export default async function HomePage() {
  const [categories, products, display] = await Promise.all([
    prisma.category.findMany(),
    prisma.product.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
    loadPageDisplay("home"),
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const placedProducts = (prefix: string) =>
    display
      .filter((item) => item.kind === "product" && item.isVisible && item.slotKey.startsWith(prefix))
      .flatMap((item) => {
        const product = productById.get(item.refId);
        return product ? [product] : [];
      });
  const bestSelling = placedProducts("best-product:");
  const promotion = placedProducts("promotion-product:");

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const quickItems = display
    .filter((item) => item.kind === "shortcut" && item.isVisible)
    .filter((item) => {
      if (!item.refId) return true;
      return categoryById.get(item.refId)?.isVisible === true;
    })
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
    }));

  const storedSections = display.filter((item) => item.kind === "section");
  const sections =
    storedSections.length > 0
      ? storedSections
      : HOME_SECTIONS.map((section) => ({
          id: section.slotKey,
          slotKey: section.slotKey,
          label: section.label,
          href: section.href,
          isVisible: true,
          sortOrder: section.sortOrder,
        }));

  return (
    <div className="pb-8">
      {sections.map((section) => {
        if (!section.isVisible) return null;
        if (section.slotKey === "section:hero") {
          return (
            <section key={section.id} className="mx-auto w-full max-w-[1520px]">
              <Link href={section.href || "/category/object"} className="block w-full">
                <Image
                  src={bannerMain}
                  alt="SELECT. STAY. BE WITH THINGS."
                  width={1520}
                  height={500}
                  priority
                  unoptimized
                  className="block h-auto w-full object-contain"
                />
              </Link>
            </section>
          );
        }
        if (section.slotKey === "section:quick") {
          if (quickItems.length === 0) return null;
          return (
            <section key={section.id} className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-12">
              <QuickMenu items={quickItems} />
            </section>
          );
        }
        if (section.slotKey === "section:best") {
          return (
            <section key={section.id} className="mx-auto w-full max-w-[1280px] px-5 pb-14 md:px-8">
              <h2 className="mb-8 text-[1.75rem] font-bold tracking-tight md:text-[2rem]">{section.label}</h2>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
                {bestSelling.map((product) => (
                  <ProductCard key={product.id} product={product} showDiscountRate showProductId />
                ))}
              </div>
            </section>
          );
        }
        if (section.slotKey === "section:coupon") {
          return (
            <section key={section.id} className="mx-auto w-full max-w-[1390px] pb-14">
              <Link
                href={section.href || "/events"}
                className="mx-auto flex aspect-[1390/190] w-full max-w-[1390px] items-center justify-center"
              >
                <Image
                  src={bannerCoupon}
                  alt="적용 가능한 모든 쿠폰 받으러가기"
                  width={1380}
                  height={180}
                  unoptimized
                  className="h-auto max-h-full w-auto max-w-full object-contain"
                />
              </Link>
            </section>
          );
        }
        if (section.slotKey === "section:promotion") {
          return (
            <section key={section.id} className="mx-auto w-full max-w-[1280px] px-5 pb-6 md:px-8">
              <h2 className="mb-8 text-[1.75rem] font-bold tracking-tight md:text-[2rem]">{section.label}</h2>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
                {promotion.map((product) => (
                  <ProductCard key={product.id} product={product} showDiscountRate showProductId />
                ))}
              </div>
            </section>
          );
        }
        return <Fragment key={section.id} />;
      })}
    </div>
  );
}
