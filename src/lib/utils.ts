export const LIMITS = {
  MAX_MEMBERS: 20,
  MAX_PRODUCTS: 50,
  MAX_CATEGORIES: 5,
} as const;

export const ORDER_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  PREPARING: "PREPARING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "결제 대기",
  PAID: "결제 완료",
  PREPARING: "상품 준비중",
  SHIPPED: "배송중",
  DELIVERED: "배송 완료",
  CANCELLED: "취소",
};

export function slugify(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `item-${Date.now()}`;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatOrderDateTime(value: Date | string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function discountedPrice(salePrice: number, discountRate: number) {
  const rate = Math.min(100, Math.max(0, discountRate || 0));
  return Math.round(salePrice * (100 - rate) / 100);
}

export function nextProductCode(lastId?: string | null) {
  const current = lastId?.startsWith("prd") ? Number.parseInt(lastId.slice(3), 10) : 0;
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `prd${String(next).padStart(4, "0")}`;
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function parseGallery(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function createOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TH-${stamp}-${rand}`;
}
