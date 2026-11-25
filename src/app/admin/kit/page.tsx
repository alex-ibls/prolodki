import { bulkKitAction } from "@/actions/kit";
import { AdminTable } from "@/components/admin-table";
import { KitCreateButton } from "@/components/kit-create-dialog";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { kitColumns, listKit } from "@/lib/admin-records";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Комплектации" };

export default async function KitCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const list = await listKit(one);
  return (
    <main>
      <AdminTable
        title="Комплектации"
        basePath="/admin/kit"
        exportHref={adminHref("/admin/export", {
          entity: "kit",
          q: list.q,
          sort: list.sort,
          dir: list.dir,
          kind: list.filters.kind,
        })}
        columns={kitColumns}
        rows={list.rows}
        filters={[
          {
            key: "kind",
            label: "Тип",
            value: list.filters.kind ?? "",
            options: [
              { value: "", label: "Все" },
              { value: "fit", label: "Исполнение" },
              { value: "extra", label: "Доп. оборудование" },
            ],
          },
        ]}
        bulk={[
          {
            value: "delete",
            label: "Удалить",
            confirmTitle: "Удалить выбранные позиции?",
            confirm: "Позиция удаляется, только если она не выбрана в карточках.",
          },
        ]}
        bulkAction={bulkKitAction}
        rowDelete={{
          value: "delete",
          label: "Удалить",
          confirmTitle: "Удалить позицию?",
          confirm: "Позиция удаляется, только если она не выбрана в карточках.",
        }}
        q={list.q}
        sort={list.sort}
        dir={list.dir}
        page={list.page}
        pages={list.pages}
        total={list.total}
        pageSize={adminPageSize}
        error={one("error")}
        saved={one("saved")}
        toolbar={<KitCreateButton />}
      />
    </main>
  );
}
