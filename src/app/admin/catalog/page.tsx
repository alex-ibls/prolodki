import { deleteCategoryAction, saveCategoryAction } from "@/actions/taxonomy";
import { ErrorNote, SavedNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";
import { childrenOf, flattenCategories, type CategoryNode } from "@/lib/taxonomy";

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
    <main className="grid gap-6">
      <h1 className="text-3xl">Структура каталога</h1>
      <ErrorNote message={one("error")} />
      <SavedNote saved={one("saved")} />
      <form action={saveCategoryAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5 md:grid-cols-4">
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
        <button className={`${buttonClass} md:col-span-4 w-fit`}>Добавить</button>
      </form>
      <CategoryBranch nodes={childrenOf(categories, null)} categories={categories} />
    </main>
  );
}

function ParentSelect({
  categories,
  currentId,
  value,
}: {
  categories: CategoryNode[];
  currentId?: number;
  value?: number | null;
}) {
  return (
    <select name="parentId" defaultValue={value ?? ""} className={inputClass}>
      <option value="">Корень каталога</option>
      {flattenCategories(categories).map(({ category, depth }) => (
        <option key={category.id} value={category.id} disabled={category.id === currentId}>
          {"— ".repeat(depth)}
          {category.name}
        </option>
      ))}
    </select>
  );
}

function CategoryBranch({ nodes, categories }: { nodes: CategoryNode[]; categories: CategoryNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <ul className="grid gap-3">
      {nodes.map((node) => (
        <li key={node.id} className="rounded-3xl border border-line bg-card p-4">
          <form action={saveCategoryAction} className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
            <input type="hidden" name="id" value={node.id} />
            <label className="text-sm">
              Название
              <input name="name" required defaultValue={node.name} className={inputClass} />
            </label>
            <label className="text-sm">
              Родитель
              <ParentSelect categories={categories} currentId={node.id} value={node.parentId} />
            </label>
            <label className="text-sm">
              Порядок
              <input name="sort" defaultValue={node.sort} className={inputClass} />
            </label>
            <button className={`${buttonClass} self-end`}>Сохранить</button>
          </form>
          <form action={deleteCategoryAction} className="mt-2">
            <input type="hidden" name="id" value={node.id} />
            <button className={secondaryClass}>Удалить</button>
          </form>
          {childrenOf(categories, node.id).length > 0 ? (
            <div className="mt-4 ml-4 border-l border-line pl-4">
              <CategoryBranch nodes={childrenOf(categories, node.id)} categories={categories} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
