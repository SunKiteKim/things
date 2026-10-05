import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LIMITS } from "@/lib/utils";

export default async function AdminHome() {
  const [members, products, categories, orders] = await Promise.all([
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
  ]);

  const cards = [
    { href: "/admin/members", label: "회원", value: `${members} / ${LIMITS.MAX_MEMBERS}` },
    { href: "/admin/products", label: "상품", value: `${products} / ${LIMITS.MAX_PRODUCTS}` },
    { href: "/admin/display/categories", label: "카테고리", value: `${categories} / ${LIMITS.MAX_CATEGORIES}` },
    { href: "/admin/display", label: "전시관리", value: "페이지별 노출" },
    { href: "/admin/orders", label: "주문", value: String(orders) },
  ];

  return (
    <div>
      <h1 className="display text-4xl" style={{ letterSpacing: "0.42em" }}>ADMIN</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="border border-line bg-surface p-6">
            <p className="text-xs uppercase tracking-widest text-muted">{card.label}</p>
            <p className="mt-3 text-2xl">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
