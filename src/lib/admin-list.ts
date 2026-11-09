export const adminPageSize = 20;
export const adminExportLimit = 5000;

export type SortDir = "asc" | "desc";

export type Reader = (key: string) => string;

export type AdminColumn = {
  key: string;
  label: string;
  sort?: string;
  firstDir?: SortDir;
};

export type AdminFilter = {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

export type AdminBulkOption = {
  value: string;
  label: string;
  needsReason?: boolean;
};

export type AdminRow = {
  id: string;
  href: string;
  cells: Record<string, string>;
};

export type ListState = {
  q: string;
  page: number;
  sort: string;
  dir: SortDir;
  offset: number;
};

export function readList(
  one: Reader,
  allowedSort: readonly string[],
  defaultSort: string,
  defaultDir: SortDir = "desc",
): ListState {
  const q = one("q").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(one("page"), 10) || 1);
  const requested = one("sort");
  const sort = allowedSort.includes(requested) ? requested : defaultSort;
  const requestedDir = one("dir");
  const dir: SortDir = requestedDir === "asc" || requestedDir === "desc" ? requestedDir : defaultDir;
  return { q, page, sort, dir, offset: (page - 1) * adminPageSize };
}

export function pageWindow(total: number, state: ListState) {
  const pages = Math.max(1, Math.ceil(total / adminPageSize));
  const page = Math.min(state.page, pages);
  return { pages, page, offset: (page - 1) * adminPageSize, total };
}

export function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function readIdList(raw: string) {
  return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 200);
}

export function adminHref(path: string, query: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
