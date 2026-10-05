import type { CouponTone } from "@/lib/member-coupons";

const TONE_COLOR: Record<CouponTone, string> = {
  product: "#3a6fd4",
  cart: "#e3943c",
};

export function couponToneColor(tone: CouponTone) {
  return TONE_COLOR[tone];
}

export function CouponTicket({ tone }: { tone: CouponTone }) {
  const stroke = TONE_COLOR[tone];
  const label = tone === "product" ? "PRODUCT" : "CART";
  return (
    <svg width="148" height="62" viewBox="0 0 148 62" role="img" aria-label={tone === "product" ? "상품 쿠폰" : "장바구니 쿠폰"} className="shrink-0">
      <rect x="1" y="1" width="146" height="60" rx="7" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
      <circle cx="1" cy="31" r="7" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
      <circle cx="147" cy="31" r="7" fill="#ffffff" stroke={stroke} strokeWidth="1.4" />
      <path d="M32 12v38" stroke={stroke} strokeDasharray="1.6 3.4" strokeLinecap="round" />
      <text x="88" y="27" textAnchor="middle" fill={stroke} fontSize="10" fontFamily="ui-sans-serif, sans-serif" letterSpacing="1.6">
        COUPON
      </text>
      <text x="88" y="42" textAnchor="middle" fill={stroke} fontSize="10" fontFamily="ui-sans-serif, sans-serif" letterSpacing="1.4">
        {label}
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
