export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 30000;
export const SHIPPING_NOTICE = `최종 결제금액 ${FREE_SHIPPING_THRESHOLD.toLocaleString("ko-KR")}원 미만 배송비 ${SHIPPING_FEE.toLocaleString("ko-KR")}원`;
export const MINIMUM_MERCHANDISE_AMOUNT = 0;

export function shippingFee(merchandiseAmount: number) {
  return merchandiseAmount <= 0 || merchandiseAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function couponCodes(value: string) {
  return [...new Set(value.split(",").map(part => part.split("@")[0].trim().toUpperCase()).filter(code => !!code && code !== "-"))];
}

export function couponTargets(value: string) {
  const targets: Record<string, string> = {};
  for (const part of value.split(",")) {
    const [rawCode, rawTarget] = part.split("@");
    const code = rawCode?.trim().toUpperCase();
    const target = rawTarget?.trim().toLowerCase();
    if (!code || !target || targets[code]) continue;
    targets[code] = target;
  }
  return targets;
}

export function couponSelection(value: string) {
  const targets = couponTargets(value);
  return couponCodes(value).map((code) => targets[code] ? `${code}@${targets[code]}` : code);
}

type Offer = { code: string; discount: number; isStackable: boolean };
export function resolvedCouponSelection(offers: Offer[], original: string) {
  const targets = couponTargets(original);
  return offers.map(offer => targets[offer.code] ? `${offer.code}@${targets[offer.code]}` : offer.code).join(",");
}

export function allocateCouponDiscounts<T extends Offer>(offers: T[], subtotal: number) {
  let remaining = combinedDiscount(offers, subtotal);
  return [...offers].sort((a, b) => a.code.localeCompare(b.code)).map(offer => {
    const amount = Math.min(Math.max(0, offer.discount), remaining);
    remaining -= amount;
    return { ...offer, amount };
  });
}

// Largest remainder allocation preserves exact integer totals without negative last rows.
export function allocateAmount(amount: number, weights: number[]) {
  const base = weights.reduce((sum, weight) => sum + weight, 0);
  if (base <= 0) return weights.map(() => 0);
  const capped = Math.min(Math.max(0, Math.floor(amount)), base);
  const shares = weights.map(weight => Math.floor(capped * weight / base));
  let remaining = capped - shares.reduce((sum, share) => sum + share, 0);
  const order = weights.map((weight, index) => ({ index, remainder: (capped * weight) % base })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (remaining-- <= 0) break;
    shares[index] += 1;
  }
  return shares;
}

type ProductOffer = Offer & { scope?: string; discountType?: string; discountValue?: number; productDiscounts?: { productId: string; onePlusOne?: boolean; discount: number; rate?: number }[] };
export function automaticCouponSelection(options: ProductOffer[], rows: { productId: string; onePlusOne?: boolean; amount: number }[], subtotal: number) {
  const isProduct = (offer: ProductOffer) => offer.scope === "PRODUCT" || offer.scope === "ONE_PLUS_ONE";
  const used = new Set<string>();
  const assigned: (Offer & { selection: string })[] = [];
  const orderedRows = [...rows].sort((a, b) => b.amount - a.amount || a.productId.localeCompare(b.productId) || Number(!!a.onePlusOne) - Number(!!b.onePlusOne));
  for (const row of orderedRows) {
    const candidates = options.filter(option => isProduct(option) && option.isStackable && !used.has(option.code)).flatMap(option => {
      const deal = option.productDiscounts?.find(deal => deal.productId === row.productId && !!deal.onePlusOne === !!row.onePlusOne);
      return deal && deal.discount > 0 ? [{ option, deal, rate: option.discountType === "PERCENT" ? option.discountValue ?? deal.rate ?? 0 : deal.rate ?? deal.discount / Math.max(1, row.amount) * 100 }] : [];
    }).sort((a, b) => b.rate - a.rate || b.deal.discount - a.deal.discount || a.option.code.localeCompare(b.option.code));
    const best = candidates[0];
    if (!best) continue;
    used.add(best.option.code);
    assigned.push({ ...best.option, discount: best.deal.discount, selection: `${best.option.code}@${row.productId.toLowerCase()}:${row.onePlusOne ? "1" : "0"}` });
  }
  const stacked = [...assigned, ...options.filter(option => !isProduct(option) && option.isStackable).map(option => ({ ...option, selection: option.code }))];
  let selection = stacked.map(option => option.selection).join(",");
  const payable = (offers: Offer[]) => { const amount = subtotal - combinedDiscount(offers, subtotal); return amount + shippingFee(amount); };
  let bestPayable = payable(stacked);
  for (const option of options.filter(option => !option.isStackable)) {
    const candidates = isProduct(option) ? (option.productDiscounts ?? []).map(deal => ({ ...option, discount: deal.discount, selection: `${option.code}@${deal.productId.toLowerCase()}:${deal.onePlusOne ? "1" : "0"}` })) : [{ ...option, selection: option.code }];
    for (const candidate of candidates) {
      if (payable([candidate]) >= bestPayable) continue;
      selection = candidate.selection;
      bestPayable = payable([candidate]);
    }
  }
  return selection || "-";
}
export function bestSingleProductCoupon(options: ProductOffer[], current: string, subtotal: number) {
  const isProduct = (offer: ProductOffer) => offer.scope === "PRODUCT" || offer.scope === "ONE_PLUS_ONE";
  const cart = options.filter(offer => !isProduct(offer) && couponCodes(current).includes(offer.code));
  const validCart = cart.length > 1 && cart.some(offer => !offer.isStackable) ? [] : cart;
  const amount = (offers: Offer[]) => {
    const merchandise = subtotal - combinedDiscount(offers, subtotal);
    return merchandise + shippingFee(merchandise);
  };
  let best = { selection: resolvedCouponSelection(validCart, current), payable: amount(validCart) };
  for (const option of options.filter(isProduct)) {
    for (const deal of option.productDiscounts ?? []) {
      const kept = option.isStackable ? validCart.filter(offer => offer.isStackable) : [];
      const payable = amount([...kept, { ...option, discount: deal.discount }]);
      const selection = [...kept.map(offer => offer.code), `${option.code}@${deal.productId}:${deal.onePlusOne ? "1" : "0"}`].join(",");
      if (payable < best.payable || (payable === best.payable && selection < best.selection)) best = { selection, payable };
    }
  }
  return best;
}
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
