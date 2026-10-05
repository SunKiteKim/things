import { cookies } from "next/headers";

export type CartLine = {
  productId: string;
  quantity: number;
  onePlusOne?: boolean;
};

const CART_COOKIE = "things_cart";
const BUY_NOW_COOKIE = "things_buy_now";
const CHECKOUT_COOKIE = "things_checkout";

function parseLines(raw: string | undefined): CartLine[] {
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

export async function getCart(): Promise<CartLine[]> {
  const jar = await cookies();
  return parseLines(jar.get(CART_COOKIE)?.value);
}

export async function getBuyNow(): Promise<CartLine[] | null> {
  const lines = parseLines((await cookies()).get(BUY_NOW_COOKIE)?.value);
  return lines.length ? lines : null;
}

export async function getCheckoutSelection(): Promise<CartLine[] | null> {
  const lines = parseLines((await cookies()).get(CHECKOUT_COOKIE)?.value);
  return lines.length ? lines : null;
}

export async function getCheckoutLines() {
  return (await getBuyNow()) ?? (await getCheckoutSelection()) ?? (await getCart());
}

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

export async function setCart(lines: CartLine[]) {
  const jar = await cookies();
  jar.set(CART_COOKIE, JSON.stringify(lines), cookieOptions);
}

export async function setBuyNow(lines: CartLine[]) {
  (await cookies()).set(BUY_NOW_COOKIE, JSON.stringify(lines), cookieOptions);
}

export async function clearBuyNow() {
  (await cookies()).set(BUY_NOW_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

export async function setCheckoutSelection(lines: CartLine[]) {
  (await cookies()).set(CHECKOUT_COOKIE, JSON.stringify(lines), cookieOptions);
}

export async function clearCheckoutSelection() {
  (await cookies()).set(CHECKOUT_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

function cookieValue(header: string | null, name: string) {
  if (!header) return undefined;
  const part = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!part) return undefined;
  try {
    return decodeURIComponent(part.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

export function paymentCookieUpdates(cookieHeader: string | null) {
  const buyNow = parseLines(cookieValue(cookieHeader, BUY_NOW_COOKIE));
  const selection = parseLines(cookieValue(cookieHeader, CHECKOUT_COOKIE));
  const cart = parseLines(cookieValue(cookieHeader, CART_COOKIE));
  if (buyNow.length) {
    return [
      { name: BUY_NOW_COOKIE, value: "", maxAge: 0 },
      { name: CHECKOUT_COOKIE, value: "", maxAge: 0 },
    ];
  }
  if (selection.length) {
    const keys = new Set(selection.map((line) => `${line.productId}:${line.onePlusOne ? "1" : "0"}`));
    const next = cart.filter((line) => !keys.has(`${line.productId}:${line.onePlusOne ? "1" : "0"}`));
    return [
      { name: CART_COOKIE, value: JSON.stringify(next), maxAge: cookieOptions.maxAge },
      { name: CHECKOUT_COOKIE, value: "", maxAge: 0 },
    ];
  }
  return [{ name: CART_COOKIE, value: "[]", maxAge: cookieOptions.maxAge }];
}

export async function getSelectedCoupon() { return (await cookies()).get("things_coupon")?.value ?? ""; }
export async function setSelectedCoupon(code: string) {
  (await cookies()).set("things_coupon", code, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 });
}
