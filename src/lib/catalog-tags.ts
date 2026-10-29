export type CatalogTag = {
  id: string;
  label: string;
  detail: string;
  group: string;
  param: "category" | "brand" | "condition" | "source" | "city" | "registered" | "availability";
  value: string;
};

export type FilterField = {
  code: string;
  name: string;
  unit: string;
  minParam: string;
  maxParam: string;
};

export type FilterSuggestion = {
  id: string;
  label: string;
  detail: string;
  draft?: string;
  changes?: Record<string, string>;
};

export type FilterChip = {
  id: string;
  label: string;
  clear: Record<string, null>;
};

export function activeFilterChips(
  fields: FilterField[],
  params: { get(name: string): string | null },
): FilterChip[] {
  return fields.flatMap((field) => {
    const min = params.get(field.minParam);
    const max = params.get(field.maxParam);
    if (!min && !max) return [];
    return [
      {
        id: field.code,
        label: filterLabel(field, min, max),
        clear: { [field.minParam]: null, [field.maxParam]: null },
      },
    ];
  });
}

export function matchFilters(fields: FilterField[], raw: string): FilterSuggestion[] {
  const query = raw.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ");
  if (query.length < 2) return [];
  const suggestions: FilterSuggestion[] = [];
  for (const field of fields) {
    const name = field.name.toLocaleLowerCase("ru");
    if (name.includes(query)) {
      suggestions.push(nameOnly(field));
      continue;
    }
    let fragment = "";
    for (let size = name.length; size >= 2; size -= 1) {
      const part = name.slice(0, size);
      if (query.startsWith(part)) {
        fragment = part;
        break;
      }
    }
    if (!fragment) {
      const word = query.split(" ")[0] ?? "";
      if (word.length >= 2 && name.includes(word)) fragment = word;
    }
    if (!fragment) continue;
    const rest = query.slice(fragment.length).trim();
    const range = parseRange(rest);
    if (!range) {
      if (!rest || rest === "от" || rest === "до") suggestions.push(nameOnly(field, rest));
      continue;
    }
    const unit = field.unit ? ` ${field.unit}` : "";
    if (range.min != null && range.max != null) {
      suggestions.push({
        id: `${field.code}:${range.min}-${range.max}`,
        label: `${field.name} ${showNumber(range.min)}–${showNumber(range.max)}${unit}`,
        detail: "диапазон",
        changes: {
          [field.minParam]: storeNumber(range.min),
          [field.maxParam]: storeNumber(range.max),
        },
      });
      continue;
    }
    if (range.min != null) {
      suggestions.push({
        id: `${field.code}:min:${range.min}`,
        label: `${field.name} от ${showNumber(range.min)}${unit}`,
        detail: "от",
        changes: { [field.minParam]: storeNumber(range.min) },
      });
    }
    if (range.max != null || range.side == null) {
      const value = range.max ?? range.min;
      if (value == null) continue;
      suggestions.push({
        id: `${field.code}:max:${value}`,
        label: `${field.name} до ${showNumber(value)}${unit}`,
        detail: "до",
        changes: { [field.maxParam]: storeNumber(value) },
      });
    }
  }
  return suggestions.slice(0, 6);
}

function nameOnly(field: FilterField, rest = ""): FilterSuggestion {
  const tail = rest ? ` ${rest}` : "";
  return {
    id: `${field.code}:name`,
    label: field.name,
    detail: field.unit ? `укажите значение, ${field.unit}` : "укажите значение",
    draft: `${field.name}${tail} `,
  };
}

function filterLabel(field: FilterField, min: string | null, max: string | null) {
  const unit = field.unit ? ` ${field.unit}` : "";
  const from = min ? showNumber(Number(min.replace(",", "."))) : "";
  const to = max ? showNumber(Number(max.replace(",", "."))) : "";
  if (min && max) return `${field.name} ${from}–${to}${unit}`;
  if (min) return `${field.name} от ${from}${unit}`;
  return `${field.name} до ${to}${unit}`;
}

function parseRange(rest: string) {
  if (!rest) return null;
  const number = "(\\d[\\d\\s]*(?:[.,]\\d+)?)";
  const between = new RegExp(`^от\\s+${number}\\s+до\\s+${number}$`).exec(rest);
  if (between) return { min: readNumber(between[1]), max: readNumber(between[2]), side: "min" as const };
  const span = new RegExp(`^${number}\\s*[-–—]\\s*${number}$`).exec(rest);
  if (span) return { min: readNumber(span[1]), max: readNumber(span[2]), side: null };
  const from = new RegExp(`^от\\s+${number}$`).exec(rest);
  if (from) return { min: readNumber(from[1]), max: null, side: "min" as const };
  const to = new RegExp(`^до\\s+${number}$`).exec(rest);
  if (to) return { min: null, max: readNumber(to[1]), side: "max" as const };
  const only = new RegExp(`^${number}$`).exec(rest);
  if (only) return { min: readNumber(only[1]), max: null, side: null };
  return null;
}

function readNumber(raw: string) {
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function storeNumber(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function showNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
}

export function matchCatalogTags(tags: CatalogTag[], raw: string, taken: Set<string>) {
  const query = raw.trim().toLocaleLowerCase("ru");
  if (!query) return [];
  const scored = tags.flatMap((tag) => {
    if (taken.has(tag.id)) return [];
    const label = tag.label.toLocaleLowerCase("ru");
    const detail = tag.detail.toLocaleLowerCase("ru");
    const inLabel = label.indexOf(query);
    const inDetail = detail.indexOf(query);
    const index = inLabel >= 0 ? inLabel : inDetail;
    if (index < 0) return [];
    return [{ tag, index, starts: inLabel === 0, inLabel: inLabel >= 0 }];
  });
  scored.sort(
    (a, b) =>
      Number(b.starts) - Number(a.starts) ||
      Number(b.inLabel) - Number(a.inLabel) ||
      a.index - b.index ||
      a.tag.label.localeCompare(b.tag.label, "ru"),
  );
  return scored.slice(0, 8).map((item) => item.tag);
}
