import { bulkOrdersAction } from "@/actions/admin-bulk";
import { AdminTable } from "@/components/admin-table";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { listOrders, orderColumns } from "@/lib/admin-records";
import { requireManager } from "@/lib/guards";
import { lineStatusLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Заказы компании" };

export default async function CompanyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const list = await listOrders(one);
  return (
    <main>
      <AdminTable
        title="Заказы 1P"
        basePath="/admin/orders"
        exportHref={adminHref("/admin/export", { entity: "orders", q: list.q, sort: list.sort, dir: list.dir, status: list.filters.status })}
        columns={orderColumns}
        rows={list.rows}
        filters={[
          {
            key: "status",
            label: "Статус",
            value: list.filters.status ?? "",
            options: [
              { value: "", label: "Все статусы" },
              ...Object.entries(lineStatusLabel).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        bulk={[
          { value: "confirmed", label: "Подтвердить" },
          { value: "completed", label: "Завершить" },
          { value: "cancelled", label: "Отменить" },
        ]}
        bulkAction={bulkOrdersAction}
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
