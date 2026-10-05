import type { CouponTone } from "@/lib/member-coupons";

const TONE_COLOR: Record<CouponTone, string> = {
  product: "#2f6fe4",
  cart: "#f08a24",
};

export function couponToneColor(tone: CouponTone) {
  return TONE_COLOR[tone];
}

export function CouponTicket({ tone }: { tone: CouponTone }) {
  const stroke = TONE_COLOR[tone];
  return (
    <svg width="76" height="46" viewBox="0 0 76 46" role="img" aria-label={tone === "product" ? "상품 쿠폰" : "장바구니 쿠폰"} className="shrink-0 bg-white">
      <rect x="1.5" y="1.5" width="73" height="43" rx="5" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
      <circle cx="1.5" cy="23" r="4.5" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
      <circle cx="74.5" cy="23" r="4.5" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
      <path d="M22 8v30" stroke={stroke} strokeDasharray="2 3" />
      <text x="46" y="20" textAnchor="middle" fill={stroke} fontSize="8" fontFamily="sans-serif" letterSpacing="0.5">
        COUPON
      </text>
      <text x="46" y="32" textAnchor="middle" fill={stroke} fontSize="7" fontFamily="sans-serif">
        {tone === "product" ? "PRODUCT" : "CART"}
      </text>
    </svg>
  );
}

export function EmptyCouponMark() {
  return (
    <svg width="148" height="108" viewBox="0 0 148 108" role="img" aria-label="보유한 쿠폰 없음" className="mx-auto">
      <rect width="148" height="108" rx="8" fill="#ececec" />
      <path d="M28 18 L120 90 M120 18 L28 90" stroke="#c8c8c8" strokeWidth="10" strokeLinecap="square" />
    </svg>
  );
}
