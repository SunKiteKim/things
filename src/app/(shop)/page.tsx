import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";
import { QuickMenu } from "@/components/quick-menu";
import bannerMain from "@/img/banner_main_things_1520_500.png";
import bannerCoupon from "@/img/banner_coupon_things_1380_180.png";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const bestSelling = products.filter((item) => item.isFeatured).slice(0, 4);
  const promotion = products
    .filter((item) => !bestSelling.some((best) => best.id === item.id))
    .slice(0, 4);

  const iconBySlug: Record<string, "object" | "light" | "table" | "textile" | "scent"> = {
    object: "object",
    light: "light",
    table: "table",
    textile: "textile",
    scent: "scent",
  };

  const quickItems = [
    ...categories.map((category) => ({
      href: `/category/${category.slug}`,
      label: category.name,
      icon: iconBySlug[category.slug] ?? ("object" as const),
    })),
    { href: "/events", label: "이벤트", icon: "event" as const },
    { href: "/events", label: "쿠폰", icon: "coupon" as const },
    { href: "/mypage", label: "마이", icon: "account" as const },
  ];

  return (
    <div className="pb-8">
      <section className="mx-auto w-full max-w-[1520px]">
        <Link href="/category/object" className="block w-full">
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

      <section className="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-12">
        <QuickMenu items={quickItems} />
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 pb-14 md:px-8">
        <h2 className="mb-8 text-[1.75rem] font-bold tracking-tight md:text-[2rem]">Best Selling</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
          {bestSelling.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1390px] pb-14">
        <Link
          href="/events"
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

      <section className="mx-auto w-full max-w-[1280px] px-5 pb-6 md:px-8">
        <h2 className="mb-8 text-[1.75rem] font-bold tracking-tight md:text-[2rem]">Promotion product2</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
          {promotion.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
