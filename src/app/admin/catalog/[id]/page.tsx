import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction, saveCategoryCharacteristicsAction } from "@/actions/taxonomy";
import { CharacteristicForm } from "@/components/characteristic-form";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ParentSelect } from "@/components/parent-select";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";
import { categoryCharacteristicLayers } from "@/lib/characteristics";
import { categoryPath, childrenOf } from "@/lib/taxonomy";

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { id: raw } = await params;
  const id = Number(raw);
  const { one } = await readQuery(searchParams);
  const categories = await allCategories();
  const category = categories.find((item) => item.id === id);
  if (!category) notFound();
  const children = childrenOf(categories, category.id);
  const { own: specs, inherited } = await categoryCharacteristicLayers(category.id);
  const sortOf = [...inherited, ...specs].reduce((max, item) => Math.max(max, item.cardOrder), 0);
  return (
    <main className="grid max-w-4xl gap-6">
      <CrumbTitle label={category.name} />
      <h1 className="text-2xl sm:text-3xl">{category.name}</h1>
      <p className="text-sm text-muted">{categoryPath(categories, category.id)}</p>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      {one("saved") ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <form action={saveCategoryAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <input type="hidden" name="id" value={category.id} />
        <label className="text-sm">
          Название
          <input name="name" required defaultValue={category.name} className={inputClass} />
        </label>
        <label className="text-sm">
          Родитель
          <ParentSelect categories={categories} currentId={category.id} value={category.parentId} />
        </label>
        <label className="text-sm">
          Порядок
          <input name="sort" defaultValue={category.sort} className={inputClass} />
        </label>
        <button className={`${buttonClass} w-fit`}>Сохранить</button>
      </form>
      {inherited.length > 0 ? (
        <section className="grid gap-3 rounded-2xl border border-line bg-card p-4">
          <div>
            <h2 className="text-xl">Характеристики верхних разделов</h2>
            <p className="mt-1 text-sm text-muted">
              Они действуют здесь и во вложенных разделах. Изменить их можно в разделе, где они заданы.
            </p>
          </div>
          <ul className="grid gap-2">
            {inherited.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-2 text-sm">
                <span>
                  {item.name}
                  {item.unit ? <span className="text-muted">, {item.unit}</span> : null}
                  <span className="text-muted"> · {item.dataType === "text" ? "текст" : "число"}</span>
                  {item.filterable ? <span className="text-muted"> · в фильтре</span> : null}
                </span>
                <Link href={`/admin/catalog/${item.categoryId}`} className="text-navy">
                  {item.source}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <CharacteristicForm
        action={saveCategoryCharacteristicsAction}
        title="Свои характеристики"
        hint="Новое поле действует в этом разделе и во всех вложенных. Характеристику верхнего раздела повторять не нужно. «В фильтре» показывает поле в каталоге, когда значения различаются."
        rows={specs.map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          dataType: item.dataType,
          sort: item.cardOrder,
          filterable: item.filterable,
        }))}
        showFilter
        nextSort={sortOf + 1}
        emptyText="Своих характеристик пока нет."
        hidden={[{ name: "categoryId", value: String(category.id) }]}
      />
      {children.length > 0 ? (
        <section>
          <h2 className="text-xl">Вложенные разделы</h2>
          <ul className="mt-3 space-y-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link href={`/admin/catalog/${child.id}`} className="text-navy">
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <form action={deleteCategoryAction}>
        <input type="hidden" name="id" value={category.id} />
        <button className={secondaryClass}>Удалить категорию</button>
      </form>
    </main>
  );
}
