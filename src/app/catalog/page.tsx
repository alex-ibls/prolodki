import Link from "next/link";
import { ProductGrid } from "@/components/catalog-ui";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { searchCatalog, type CatalogQuery } from "@/lib/catalog";
import { readQuery } from "@/lib/query";
import { flattenCategories } from "@/lib/taxonomy";

export const metadata = { title: "Каталог" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { raw, one } = await readQuery(searchParams);
  const attrs: NonNullable<CatalogQuery["attrs"]> = {};
  for (const [key, value] of Object.entries(raw)) {
    const match = key.match(/^attr_(.+)_(min|max)$/);
    if (!match) continue;
    const text = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
    attrs[match[1]] ??= {};
    attrs[match[1]][match[2] as "min" | "max"] = text;
  }
  const query: CatalogQuery = {
    q: one("q"),
    category: one("category"),
    brand: one("brand"),
    condition: one("condition"),
    source: one("source"),
    city: one("city"),
    priceMin: one("price_min"),
    priceMax: one("price_max"),
    sort: one("sort") || "new",
    page: one("page"),
    attrs,
  };
  const result = await searchCatalog(query);
  const preserved = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "page") continue;
    const text = Array.isArray(value) ? value[0] : value;
    if (text) preserved.set(key, text);
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <form action="/catalog" className="h-fit rounded-3xl border border-line bg-card p-4">
        <h1 className="text-xl">Каталог</h1>
        <label className="mt-3 block text-sm">
          Категория
          <select name="category" defaultValue={query.category} className={inputClass}>
            <option value="">Все</option>
            {flattenCategories(result.categories).map(({ category, depth }) => (
              <option key={category.id} value={category.slug}>
                {"— ".repeat(depth)}
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Поиск
          <input name="q" defaultValue={query.q} className={inputClass} />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm">
            Цена от
            <input name="price_min" defaultValue={query.priceMin} className={inputClass} />
          </label>
          <label className="text-sm">
            до
            <input name="price_max" defaultValue={query.priceMax} className={inputClass} />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          Бренд
          <select name="brand" defaultValue={query.brand} className={inputClass}>
            <option value="">Все</option>
            {result.brands.map((brand) => (
              <option key={brand.slug} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Состояние
          <select name="condition" defaultValue={query.condition} className={inputClass}>
            <option value="">Все</option>
            <option value="new">Новый</option>
            <option value="used">БУ</option>
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Продавец
          <select name="source" defaultValue={query.source} className={inputClass}>
            <option value="">Все</option>
            <option value="company">Компания</option>
            <option value="individual">Частное лицо</option>
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Город
          <select name="city" defaultValue={query.city} className={inputClass}>
            <option value="">Все</option>
            {result.cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Сортировка
          <select name="sort" defaultValue={query.sort} className={inputClass}>
            <option value="new">Сначала новые</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
          </select>
        </label>
        {result.defs.map((def) => (
          <div key={def.id} className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-sm">
              {def.name} от
              <input
                name={`attr_${def.code}_min`}
                defaultValue={query.attrs?.[def.code]?.min}
                className={inputClass}
              />
            </label>
            <label className="text-sm">
              до
              <input
                name={`attr_${def.code}_max`}
                defaultValue={query.attrs?.[def.code]?.max}
                className={inputClass}
              />
            </label>
          </div>
        ))}
        <button className={`${buttonClass} mt-4 w-full`}>Показать</button>
      </form>
      <section>
        <p className="mb-4 text-sm text-muted">Найдено: {result.total}</p>
        <ProductGrid items={result.rows} />
        <div className="mt-6 flex gap-2">
          {Array.from({ length: result.pages }, (_, index) => {
            const page = index + 1;
            const params = new URLSearchParams(preserved);
            if (page > 1) params.set("page", String(page));
            const href = params.size ? `/catalog?${params}` : "/catalog";
            return (
              <Link key={page} href={href} className={page === result.page ? buttonClass : secondaryClass}>
                {page}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
