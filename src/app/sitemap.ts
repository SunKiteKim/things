import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const paths = ["/", "/products", "/best", "/events", "/login", "/signup", "/search"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: new Date(),
  }));
}
