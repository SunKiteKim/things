const SEOUL = "Asia/Seoul";
const DAY_START_MS = 1000;

export function todayPickKey(now = new Date()) {
  const shifted = new Date(now.getTime() - DAY_START_MS);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

function hashSeed(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const AFFORDABLE_MAX = 30000;

function shuffle<T>(pool: T[], random: () => number) {
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = pool[index];
    pool[index] = pool[swap];
    pool[swap] = current;
  }
}

function isAffordable(product: { price?: number }) {
  return typeof product.price === "number" && product.price <= AFFORDABLE_MAX;
}

export function pickToday<T extends { id: string; price?: number }>(products: T[], count = 4, now = new Date()) {
  const pool = [...products].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const random = mulberry32(hashSeed(`today-pick:${todayPickKey(now)}`));
  shuffle(pool, random);
  const size = Math.max(0, count);
  const picked = pool.slice(0, size);
  if (size === 0 || picked.some(isAffordable) || !pool.some((product) => typeof product.price === "number")) return picked;
  const cheap = pool.find(isAffordable);
  if (!cheap) return picked;
  const next = [...picked.slice(0, size - 1), cheap];
  shuffle(next, random);
  return next;
}
