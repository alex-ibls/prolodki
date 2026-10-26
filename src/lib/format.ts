export function formatRub(kopeks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: kopeks % 100 === 0 ? 0 : 2,
  }).format(kopeks / 100);
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function parsePriceToKopeks(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [rub, frac = ""] = cleaned.split(".");
  return Number(rub) * 100 + Number(frac.padEnd(2, "0"));
}

export function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function parseIntStrict(raw: string): number | null {
  const cleaned = raw.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function orderCode(orderNo: number) {
  return `ПЛ-${orderNo}`;
}

export function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  if (national.length === 11 && national.startsWith("7")) {
    return `+7 (${national.slice(1, 4)}) ${national.slice(4, 7)}-${national.slice(7, 9)}-${national.slice(9)}`;
  }
  return raw.trim();
}
