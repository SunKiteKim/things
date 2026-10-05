"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/default-product-image";

export function ProductImage({
  src,
  alt = "",
  className = "object-cover",
  fill = false,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  fill?: boolean;
}) {
  const [current, setCurrent] = useState(src || DEFAULT_PRODUCT_IMAGE);

  useEffect(() => {
    setCurrent(src || DEFAULT_PRODUCT_IMAGE);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      onError={() => setCurrent((value) => (value === DEFAULT_PRODUCT_IMAGE ? value : DEFAULT_PRODUCT_IMAGE))}
      className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
    />
  );
}
