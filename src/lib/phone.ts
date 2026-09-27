export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("008210")) return `010${digits.slice(6)}`;
  if (digits.startsWith("8210")) return `010${digits.slice(4)}`;
  return digits;
}
