import { bulkDealsAction } from "@/actions/admin-bulk";
import { AdminTable } from "@/components/admin-table";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { dealColumns, listDeals } from "@/lib/admin-records";
import { requireManager } from "@/lib/guards";
import { dealStatusLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Сделки" };

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const list = await listDeals(one);
  return (
    <main>
      <AdminTable
        title="Сделки"
        basePath="/admin/crm/deals"
        exportHref={adminHref("/admin/export", { entity: "deals", q: list.q, sort: list.sort, dir: list.dir, status: list.filters.status })}
        columns={dealColumns}
        rows={list.rows}
        filters={[
          {
            key: "status",
            label: "Статус",
            value: list.filters.status ?? "",
            options: [
              { value: "", label: "Все статусы" },
              ...Object.entries(dealStatusLabel).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        bulk={Object.entries(dealStatusLabel).map(([value, label]) => ({ value, label: `Статус: ${label}` }))}
        bulkAction={bulkDealsAction}
        q={list.q}
        sort={list.sort}
        dir={list.dir}
        page={list.page}
        pages={list.pages}
        total={list.total}
        pageSize={adminPageSize}
        error={one("error")}
        saved={one("saved")}
      />
    </main>
  );
}
