import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/taxonomy";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ParentSelect } from "@/components/parent-select";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";
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
  return (
    <main className="grid max-w-3xl gap-6">
      <CrumbTitle label={category.name} />
      <h1 className="text-2xl sm:text-3xl">{category.name}</h1>
      <p className="text-sm text-muted">{categoryPath(categories, category.id)}</p>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      {one("saved") ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <form action={saveCategoryAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5">
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
