import Link from "next/link";
import { bulkNomenclatureAction } from "@/actions/admin-bulk";
import { AdminTable } from "@/components/admin-table";
import { buttonClass, secondaryClass } from "@/components/styles";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { listNomenclature, nomenclatureColumns } from "@/lib/admin-records";
import { allCategories } from "@/lib/catalog";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";
import { flattenCategories } from "@/lib/taxonomy";

export const metadata = { title: "Номенклатура" };

export default async function NomenclaturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const [list, categories] = await Promise.all([listNomenclature(one), allCategories()]);
  return (
    <main>
      <AdminTable
        title="Номенклатура"
        basePath="/admin/nomenclature"
        exportHref={adminHref("/admin/export", {
          entity: "nomenclature",
          q: list.q,
          sort: list.sort,
          dir: list.dir,
          published: list.filters.published,
          category: list.filters.category,
        })}
        columns={nomenclatureColumns}
        rows={list.rows}
        filters={[
          {
            key: "category",
            label: "Категория",
            value: list.filters.category ?? "",
            options: [
              { value: "", label: "Все категории" },
              ...flattenCategories(categories).map(({ category, depth }) => ({
                value: String(category.id),
                label: `${"— ".repeat(depth)}${category.name}`,
              })),
            ],
          },
          {
            key: "published",
            label: "Витрина",
            value: list.filters.published ?? "",
            options: [
              { value: "", label: "Все" },
              { value: "yes", label: "На витрине" },
              { value: "no", label: "Скрытые" },
            ],
          },
        ]}
        bulk={[
          { value: "publish", label: "Опубликовать" },
          { value: "unpublish", label: "Снять с витрины" },
        ]}
        bulkAction={bulkNomenclatureAction}
        q={list.q}
        sort={list.sort}
        dir={list.dir}
        page={list.page}
        pages={list.pages}
        total={list.total}
        pageSize={adminPageSize}
        error={one("error")}
        saved={one("saved")}
        toolbar={
          <>
            <Link href="/admin/nomenclature/import" className={secondaryClass}>
              Загрузка CSV
            </Link>
            <Link href="/admin/nomenclature/new" className={buttonClass}>
              Новая позиция
            </Link>
          </>
        }
      />
    </main>
  );
}
