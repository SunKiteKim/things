import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { prisma } from "@/lib/prisma";

const paths = ["/", "/products", "/best", "/events", "/coupons", "/login", "/signup", "/search"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    select: { id: true, updatedAt: true },
  });

  return [
    ...paths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/product/${product.id}`,
      lastModified: product.updatedAt,
    })),
  ];
}
