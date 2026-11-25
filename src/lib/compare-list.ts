const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const compareLimit = 5;

export function compareIdsFromPath(ids: string[] | undefined) {
  const clean = (ids ?? []).map((id) => id.toLowerCase()).filter((id) => uuid.test(id));
  return [...new Set(clean)].slice(0, compareLimit);
}

export function compareHref(ids: string[]) {
  return ids.length ? `/compare/${ids.join("/")}` : "/compare";
}
