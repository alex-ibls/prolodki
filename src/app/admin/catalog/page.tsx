import { deleteCategoryAction, saveCatalogRowsAction, saveCategoryAction } from "@/actions/taxonomy";
import { bulkCatalogAction } from "@/actions/admin-bulk";
import { CatalogTree } from "@/components/catalog-tree";
import { ParentSelect } from "@/components/parent-select";
import { buttonClass, inputClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Каталог" };

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const categories = await allCategories();
  return (
    <main className="grid gap-4">
      <CatalogTree
        categories={categories.map((item) => ({
          id: item.id,
          parentId: item.parentId,
          name: item.name,
          sort: item.sort,
        }))}
        initialQuery={one("q")}
        error={one("error")}
        saved={one("saved")}
        bulkAction={bulkCatalogAction}
        saveAction={saveCatalogRowsAction}
        deleteAction={deleteCategoryAction}
      />
      <form action={saveCategoryAction} className="grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-4">
        <label className="text-sm md:col-span-2">
          Новая категория
          <input name="name" required className={inputClass} />
        </label>
        <label className="text-sm">
          Родитель
          <ParentSelect categories={categories} />
        </label>
        <label className="text-sm">
          Порядок
          <input name="sort" defaultValue="0" className={inputClass} />
        </label>
        <button className={`${buttonClass} w-fit md:col-span-4`}>Добавить</button>
      </form>
    </main>
  );
}
