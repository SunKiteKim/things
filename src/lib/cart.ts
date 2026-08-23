import { cookies } from "next/headers";

export type CartLine = {
  productId: string;
  quantity: number;
};

const CART_COOKIE = "things_cart";

export async function getCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed)
      ? parsed.filter((line) => line.productId && line.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export async function setCart(lines: CartLine[]) {
  const jar = await cookies();
  jar.set(CART_COOKIE, JSON.stringify(lines), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}
