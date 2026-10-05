export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 30000;
export const SHIPPING_NOTICE = `최종 상품 결제금액 ${FREE_SHIPPING_THRESHOLD.toLocaleString("ko-KR")}원 미만 배송비 ${SHIPPING_FEE.toLocaleString("ko-KR")}원 · 이상 무료배송 (모든 할인 적용 후, 배송비 제외)`;
export const MINIMUM_MERCHANDISE_AMOUNT = 1;

export function shippingFee(merchandiseAmount: number) {
  return merchandiseAmount <= 0 || merchandiseAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function couponCodes(value: string) {
  return [...new Set(value.split(",").map(code => code.trim().toUpperCase()).filter(code => !!code && code !== "-"))];
}

type Offer = { code: string; discount: number; isStackable: boolean };
export function combinedDiscount(offers: Offer[], subtotal: number) {
  if (offers.length > 1 && offers.some(offer => !offer.isStackable)) throw new Error("중복 불가 쿠폰은 단독으로 적용해 주세요.");
  const limit = Math.max(0, subtotal - MINIMUM_MERCHANDISE_AMOUNT);
  return Math.min(limit, offers.reduce((sum, offer) => sum + offer.discount, 0));
}

export function selectedOffers<T extends Offer>(options: T[], selected: string, subtotal: number): T[] {
  if (selected === "-") return [];
  const codes = couponCodes(selected);
  const explicit = options.filter(option => codes.includes(option.code));
  if (explicit.length && (explicit.length === 1 || explicit.every(option => option.isStackable))) return explicit;
  const stack = options.filter(option => option.isStackable);
  const best = options.reduce<T | undefined>((winner, option) => !winner || option.discount > winner.discount ? option : winner, undefined);
  return combinedDiscount(stack, subtotal) > (best?.discount ?? 0) ? stack : best ? [best] : [];
}

export function timeSalePrice(price: number, rate: number) {
  return Math.max(MINIMUM_MERCHANDISE_AMOUNT, Math.round(price * (100 - Math.min(100, Math.max(0, rate))) / 100));
}
