type CategoryLink = { id: number; parentId: number | null; slug: string };

const pairKeys = new Set([
  "brand",
  "condition",
  "source",
  "city",
  "registered",
  "availability",
  "price",
  "date",
  "price-from",
  "price-to",
]);

export function categoryPathMap(categories: CategoryLink[]) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const paths: Record<string, string> = {};
  for (const item of categories) {
    const chain: string[] = [];
    let current: CategoryLink | undefined = item;
    const guard = new Set<number>();
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      chain.unshift(current.slug);
      current = current.parentId == null ? undefined : byId.get(current.parentId);
    }
    paths[item.slug] = chain.join("/");
  }
  return paths;
}

export function needsCatalogPath(params: URLSearchParams) {
  for (const key of params.keys()) {
    if (key !== "q" && key !== "page") return true;
  }
  return false;
}

export function catalogHref(params: URLSearchParams, paths: Record<string, string>) {
  const segments: string[] = [];
  const category = params.get("category");
  if (category) segments.push(...(paths[category] || category).split("/").filter(Boolean).map(encodePart));
  const filters = filterSegments(params);
  let path = "/";
  if (segments.length || filters.length) {
    const body = [...segments];
    if (filters.length) body.push("filter", ...filters, "apply");
    path = `/catalog/${body.join("/")}`;
  }
  const query = new URLSearchParams();
  const q = params.get("q");
  const page = params.get("page");
  if (q) query.set("q", q);
  if (page && page !== "1") query.set("page", page);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function catalogParamsFromSegments(segments: string[]) {
  const decoded = segments.map(decodePart);
  const filterAt = decoded.indexOf("filter");
  if (decoded.filter((item) => item === "filter").length > 1) return null;
  if (filterAt !== -1 && decoded.at(-1) !== "apply") return null;
  const categorySegments = filterAt === -1 ? decoded : decoded.slice(0, filterAt);
  if (categorySegments.some((item) => !item || item === "apply" || item === "filter")) return null;
  const params = new URLSearchParams();
  const category = categorySegments.at(-1);
  if (category) params.set("category", category);
  if (filterAt === -1) return { params };
  const body = decoded.slice(filterAt + 1, -1);
  for (let index = 0; index < body.length; ) {
    const key = body[index];
    if (key === "attr") {
      const code = body[index + 1];
      const side = body[index + 2];
      const value = body[index + 3];
      if (!code || (side !== "from" && side !== "to") || !value) return null;
      params.set(`attr_${code}_${side === "from" ? "min" : "max"}`, value);
      index += 4;
      continue;
    }
    if (!key || !pairKeys.has(key)) return null;
    const value = body[index + 1];
    if (!value) return null;
    if (key === "price-from") params.set("price_min", value);
    else if (key === "price-to") params.set("price_max", value);
    else params.set(key, value);
    index += 2;
  }
  return { params };
}

export function mergeCatalogParams(pathParams: URLSearchParams, query: URLSearchParams) {
  const merged = new URLSearchParams(pathParams);
  for (const [key, value] of query.entries()) {
    if (!value) continue;
    if (key === "q" || key === "page" || ((absorbed(key) || key.startsWith("attr_")) && !merged.has(key))) {
      merged.set(key, value);
    }
  }
  return merged;
}

export function catalogParamsFromLocation(pathname: string, search: Pick<URLSearchParams, "get" | "entries">) {
  const params = new URLSearchParams();
  if (pathname === "/catalog" || pathname.startsWith("/catalog/")) {
    const parsed = catalogParamsFromSegments(pathname.slice("/catalog".length).split("/").filter(Boolean));
    if (parsed) {
      for (const [key, value] of parsed.params.entries()) params.set(key, value);
    }
  }
  if (pathname === "/" || pathname === "/catalog" || pathname.startsWith("/catalog/")) {
    for (const [key, value] of search.entries()) {
      if (!value) continue;
      if (key === "q" || key === "page" || ((absorbed(key) || key.startsWith("attr_")) && !params.has(key))) {
        params.set(key, value);
      }
    }
  }
  return params;
}

export function isSameCatalogUrl(pathname: string, search: URLSearchParams, canonical: string) {
  const target = new URL(canonical, "http://sef.local");
  if (decodePath(pathname) !== decodePath(target.pathname)) return false;
  if (search.get("page") === "1") return false;
  for (const key of search.keys()) {
    if (key !== "q" && key !== "page") return false;
  }
  const actual = new URLSearchParams();
  const q = search.get("q");
  const page = search.get("page");
  if (q) actual.set("q", q);
  if (page) actual.set("page", page);
  return actual.toString() === target.searchParams.toString();
}

export function queryFromRecord(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const text = Array.isArray(value) ? value[0] : value;
    if (text) params.set(key, text);
  }
  return params;
}

function filterSegments(params: URLSearchParams) {
  const parts: string[] = [];
  const push = (key: string, value: string | null) => {
    if (!value) return;
    parts.push(key, encodePart(value));
  };
  push("brand", params.get("brand"));
  push("condition", allowed(params.get("condition"), ["new", "used"]));
  push("source", allowed(params.get("source"), ["company", "individual"]));
  push("city", params.get("city"));
  push("registered", allowed(params.get("registered"), ["yes", "no"]));
  push("availability", allowed(params.get("availability"), ["stock", "order"]));
  push("price", allowed(params.get("price") || legacyPrice(params.get("sort")), ["asc", "desc"]));
  push("price-from", params.get("price_min"));
  push("price-to", params.get("price_max"));
  const attrs = [...params.keys()]
    .map((key) => /^attr_(.+)_(min|max)$/.exec(key))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .sort((left, right) => left[1].localeCompare(right[1]) || (left[2] === right[2] ? 0 : left[2] === "min" ? -1 : 1));
  for (const match of attrs) {
    const value = params.get(match[0]);
    if (!value) continue;
    parts.push("attr", encodePart(match[1]), match[2] === "min" ? "from" : "to", encodePart(value));
  }
  return parts;
}

function absorbed(key: string) {
  return (
    key === "category" ||
    key === "brand" ||
    key === "condition" ||
    key === "source" ||
    key === "city" ||
    key === "registered" ||
    key === "availability" ||
    key === "price" ||
    key === "date" ||
    key === "price_min" ||
    key === "price_max" ||
    key === "sort"
  );
}

function allowed(value: string | null, options: string[]) {
  return value && options.includes(value) ? value : null;
}

function legacyPrice(sort: string | null) {
  if (sort === "price_asc") return "asc";
  if (sort === "price_desc") return "desc";
  return "";
}

function encodePart(value: string) {
  return encodeURIComponent(value);
}

function decodePart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodePath(path: string) {
  return path.split("/").map(decodePart).join("/");
}
