import Link from "next/link";
import { bulkCustomersAction } from "@/actions/admin-bulk";
import { AdminTable } from "@/components/admin-table";
import { buttonClass } from "@/components/styles";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { customerColumns, listCustomers } from "@/lib/admin-records";
import { requireManager } from "@/lib/guards";
import { customerSourceLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Клиенты" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const list = await listCustomers(one);
  return (
    <main>
      <AdminTable
        title="Клиенты"
        basePath="/admin/crm"
        exportHref={adminHref("/admin/export", { entity: "customers", q: list.q, sort: list.sort, dir: list.dir, source: list.filters.source })}
        columns={customerColumns}
        rows={list.rows}
        filters={[
          {
            key: "source",
            label: "Источник",
            value: list.filters.source ?? "",
            options: [
              { value: "", label: "Все источники" },
              ...Object.entries(customerSourceLabel).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        bulk={[{ value: "delete", label: "Удалить" }]}
        bulkAction={bulkCustomersAction}
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
          <Link href="/admin/crm/customers/new" className={buttonClass}>
            Новый
          </Link>
        }
      />
    </main>
  );
}
