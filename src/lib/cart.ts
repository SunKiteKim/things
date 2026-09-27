import { cookies } from "next/headers";

export type CartLine = {
  productId: string;
  quantity: number;
  onePlusOne?: boolean;
};

const CART_COOKIE = "things_cart";

export async function getCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed)
      ? parsed.filter((line) => line && typeof line.productId === "string" && Number.isSafeInteger(line.quantity) && line.quantity > 0).map(line => ({ productId: line.productId, quantity: line.quantity, onePlusOne: line.onePlusOne === true }))
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
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSelectedCoupon() { return (await cookies()).get("things_coupon")?.value ?? ""; }
export async function setSelectedCoupon(code: string) {
  (await cookies()).set("things_coupon", code, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 });
}
