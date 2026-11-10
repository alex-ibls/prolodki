export function formatRub(kopeks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: kopeks % 100 === 0 ? 0 : 2,
  }).format(kopeks / 100);
}

export function formatOffer(kopeks: number) {
  if (kopeks <= 0) return "Цена по запросу";
  return formatRub(kopeks);
}

export function formatCardWhen(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((start.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date).replace(".", "");
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

export const textInputLimit = 200;

export function decimalIssue(raw: string, options: { required?: boolean; places?: 1 | 2 } = {}) {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (!cleaned) return options.required ? "Заполните поле" : "";
  const places = options.places ?? 1;
  const pattern = places === 1 ? /^\d+([.,]\d)?$/ : /^\d+([.,]\d{1,2})?$/;
  if (!pattern.test(cleaned)) {
    return places === 1 ? "Укажите число, можно с десятыми: 4.5" : "Укажите число, можно с десятыми: 12500.5";
  }
  return "";
}

export function yearIssue(raw: string) {
  const cleaned = raw.trim();
  if (!cleaned) return "";
  if (!/^\d{4}$/.test(cleaned)) return "Год — четыре цифры, без дроби";
  const year = Number(cleaned);
  if (year < 1950 || year > 2100) return "Год должен быть от 1950 до 2100";
  return "";
}

export function textIssue(raw: string, options: { required?: boolean; min?: number; limit?: number } = {}) {
  const value = raw.trim();
  const limit = options.limit ?? textInputLimit;
  if (!value) return options.required ? "Заполните поле" : "";
  if (options.min && value.length < options.min) return `Не короче ${options.min} символов`;
  if (value.length > limit) return `Не больше ${limit} символов`;
  return "";
}

export function rubleIssue(raw: string, required = false) {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (!cleaned) return required ? "Укажите цену в рублях" : "";
  if (!/^\d+$/.test(cleaned) || Number(cleaned) <= 0) return "Укажите цену целым числом, без копеек";
  return "";
}

export function parseRublesToKopeks(raw: string): number | null {
  if (rubleIssue(raw, true)) return null;
  return Number(raw.trim().replace(/\s/g, "")) * 100;
}

export function formatTenthsInput(raw: string, caret = raw.length, places = 1) {
  const end = Math.max(0, Math.min(caret, raw.length));
  let digits = "";
  let fraction = "";
  let dot = false;
  let nextCaret = 0;
  const apply = (index: number) => {
    const whole = digits.replace(/^0+(?=\d)/, "");
    const shown = dot ? `${whole || "0"}.${fraction}` : whole;
    if (index < end) nextCaret = shown.length;
    return shown;
  };
  let shown = "";
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char >= "0" && char <= "9") {
      if (!dot) digits += char;
      else if (fraction.length < places) fraction += char;
      else continue;
    } else if ((char === "," || char === ".") && !dot) {
      dot = true;
    } else {
      continue;
    }
    shown = apply(index);
  }
  if (!shown) shown = apply(raw.length);
  return { value: shown, caret: nextCaret };
}

export function formatRublesInput(raw: string, caret = raw.length) {
  const end = Math.max(0, Math.min(caret, raw.length));
  const digitsBefore = raw.slice(0, end).replace(/\D/g, "").replace(/^0+(?=\d)/, "").length;
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  let seen = 0;
  let nextCaret = value.length;
  if (digitsBefore === 0) nextCaret = 0;
  else {
    for (let index = 0; index < value.length; index += 1) {
      if (/\d/.test(value[index])) seen += 1;
      if (seen === digitsBefore) {
        nextCaret = index + 1;
        break;
      }
    }
  }
  return { value, caret: nextCaret };
}

export function formatYearInput(raw: string, caret = raw.length) {
  const end = Math.max(0, Math.min(caret, raw.length));
  const digitsBefore = raw.slice(0, end).replace(/\D/g, "").length;
  const value = raw.replace(/\D/g, "").slice(0, 4);
  return { value, caret: Math.min(digitsBefore, value.length) };
}

export function parseTenths(raw: string): number | null {
  if (decimalIssue(raw, { places: 1 })) return null;
  return Number(raw.trim().replace(/\s/g, "").replace(",", "."));
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
