import { deleteBrandAction, saveBrandAction } from "@/actions/taxonomy";
import { ErrorNote, SavedNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";
import { allBrands } from "@/lib/taxonomy";

export const metadata = { title: "Бренды" };

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const brands = await allBrands();
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl">Бренды</h1>
      <ErrorNote message={one("error")} />
      <SavedNote saved={one("saved")} />
      <form action={saveBrandAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5 md:grid-cols-[1fr_120px_auto]">
        <label className="text-sm">
          Новый бренд
          <input name="name" required className={inputClass} />
        </label>
        <label className="text-sm">
          Порядок
          <input name="sort" defaultValue="0" className={inputClass} />
        </label>
        <button className={`${buttonClass} self-end`}>Добавить</button>
      </form>
      <ul className="grid gap-3">
        {brands.map((brand) => (
          <li key={brand.id} className="rounded-3xl border border-line bg-card p-4">
            <form action={saveBrandAction} className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
              <input type="hidden" name="id" value={brand.id} />
              <label className="text-sm">
                Название
                <input name="name" required defaultValue={brand.name} className={inputClass} />
              </label>
              <label className="text-sm">
                Порядок
                <input name="sort" defaultValue={brand.sort} className={inputClass} />
              </label>
              <button className={`${buttonClass} self-end`}>Сохранить</button>
            </form>
            <form action={deleteBrandAction} className="mt-2">
              <input type="hidden" name="id" value={brand.id} />
              <button className={secondaryClass}>Удалить</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
