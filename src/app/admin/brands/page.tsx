import { saveBrandAction } from "@/actions/taxonomy";
import { bulkBrandsAction } from "@/actions/admin-bulk";
import { AdminTable } from "@/components/admin-table";
import { buttonClass, inputClass } from "@/components/styles";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { brandColumns, listBrands } from "@/lib/admin-records";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Бренды" };

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const list = await listBrands(one);
  return (
    <main>
      <AdminTable
        title="Бренды"
        basePath="/admin/brands"
        exportHref={adminHref("/admin/export", { entity: "brands", q: list.q, sort: list.sort, dir: list.dir })}
        columns={brandColumns}
        rows={list.rows}
        filters={[]}
        bulk={[{ value: "delete", label: "Удалить" }]}
        bulkAction={bulkBrandsAction}
        q={list.q}
        sort={list.sort}
        dir={list.dir}
        page={list.page}
        pages={list.pages}
        total={list.total}
        pageSize={adminPageSize}
        error={one("error")}
        saved={one("saved")}
        footer={
          <form action={saveBrandAction} className="grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-[1fr_120px_auto]">
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
        }
      />
    </main>
  );
}
