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
    { href: "/admin/orders", label: "주문", value: String(orders) },
  ];

  return (
    <div>
      <h1 className="display text-4xl">tHings Admin</h1>
      <p className="mt-2 text-sm text-muted">포트폴리오 한도 안에서 CRUD를 운영합니다. 주문은 생성 없이 조회·수정·취소만 가능합니다.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
