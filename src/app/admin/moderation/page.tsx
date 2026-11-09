import { bulkModerationAction } from "@/actions/admin-bulk";
import { AdminTable } from "@/components/admin-table";
import { adminHref, adminPageSize } from "@/lib/admin-list";
import { listModeration, moderationColumns } from "@/lib/admin-records";
import { requireModerator } from "@/lib/guards";
import { listingStatusLabel, sourceLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Модерация" };

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModerator();
  const { one } = await readQuery(searchParams);
  const list = await listModeration(one);
  return (
    <main>
      <AdminTable
        title="Модерация"
        basePath="/admin/moderation"
        exportHref={adminHref("/admin/export", {
          entity: "moderation",
          q: list.q,
          sort: list.sort,
          dir: list.dir,
          status: list.filters.status,
          source: list.filters.source,
        })}
        columns={moderationColumns}
        rows={list.rows}
        filters={[
          {
            key: "status",
            label: "Статус",
            value: list.filters.status ?? "pending_review",
            options: [
              { value: "all", label: "Все статусы" },
              ...Object.entries(listingStatusLabel).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            key: "source",
            label: "Источник",
            value: list.filters.source ?? "",
            options: [
              { value: "", label: "Все источники" },
              ...Object.entries(sourceLabel).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        bulk={[
          { value: "approve", label: "Одобрить" },
          { value: "reject", label: "Отклонить", needsReason: true },
        ]}
        bulkAction={bulkModerationAction}
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
