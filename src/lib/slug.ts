const map: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string) {
  const lower = input.trim().toLowerCase();
  const translit = [...lower].map((char) => map[char] ?? char).join("");
  const slug = translit
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || "item";
}

export function productSlug(title: string, id: string) {
  const name = slugify(title).slice(0, 60).replace(/-+$/g, "") || "tovar";
  const token = id.replace(/-/g, "").toLowerCase();
  return `${name}-${token}`;
}
