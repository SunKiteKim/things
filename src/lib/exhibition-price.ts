import { formatPrice } from "@/lib/utils";

export type ExhibitionOffer = {
  discountType: "PERCENT" | "AMOUNT";
  discountValue: number;
};

export function exhibitionUnitPrice(basePrice: number, offer?: ExhibitionOffer | null) {
  if (!offer || !Number.isSafeInteger(offer.discountValue) || offer.discountValue <= 0 || !Number.isSafeInteger(basePrice) || basePrice < 0) return basePrice;
  if (offer.discountType === "PERCENT") {
    if (offer.discountValue > 100) return basePrice;
    return Math.max(0, basePrice - Math.floor((basePrice * offer.discountValue) / 100));
  }
  if (offer.discountType === "AMOUNT") return Math.max(0, basePrice - offer.discountValue);
  return basePrice;
}

export function bestExhibitionOffer(basePrice: number, offers: ExhibitionOffer[]) {
  return offers.reduce<{ offer: ExhibitionOffer | null; price: number }>((best, offer) => {
    const price = exhibitionUnitPrice(basePrice, offer);
    return price < best.price ? { offer, price } : best;
  }, { offer: null, price: basePrice });
}

export function discountPercentLabel(base: number, price: number) {
  if (!Number.isFinite(base) || base <= 0 || price >= base) return "0%";
  return `${Math.max(1, Math.round(((base - price) / base) * 100))}%`;
}

export function exhibitionOfferLabel(offer: Pick<ExhibitionOffer, "discountType" | "discountValue">) {
  if (offer.discountType === "PERCENT") return `${offer.discountValue}%`;
  if (offer.discountType === "AMOUNT") return formatPrice(offer.discountValue);
  return "없음";
}

export function asExhibitionOffer(discountType: string, discountValue: number): ExhibitionOffer | null {
  if ((discountType !== "PERCENT" && discountType !== "AMOUNT") || discountValue <= 0) return null;
  return { discountType, discountValue };
}
