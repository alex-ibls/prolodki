import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { moderateAction } from "@/actions/admin";
import { CrumbTitle } from "@/components/breadcrumbs";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { formatDate, formatRub } from "@/lib/format";
import { requireModerator } from "@/lib/guards";
import { conditionLabel, listingStatusLabel, sourceLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";

export default async function ModerationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModerator();
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const row = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: { images: true, category: true, seller: true },
  });
  if (!row) notFound();
  return (
    <main className="grid max-w-3xl gap-6">
      <CrumbTitle label={row.title} />
      <h1 className="text-2xl sm:text-3xl">{row.title}</h1>
      <p className="text-sm text-muted">
        {[
          listingStatusLabel[row.status],
          sourceLabel[row.source],
          row.category?.name,
          formatRub(row.priceKopeks),
          conditionLabel[row.condition],
          row.city,
          row.seller?.name,
          formatDate(row.createdAt),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      {row.rejectionReason ? <p className="text-sm">Причина отклонения: {row.rejectionReason}</p> : null}
      {row.description ? <p className="text-sm">{row.description}</p> : null}
      {row.images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {row.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.id} src={`/media/${image.path}`} alt="" className="h-32 w-44 rounded-xl object-cover" />
          ))}
        </div>
      ) : null}
      {row.status === "pending_review" ? (
        <div className="flex flex-wrap gap-2">
          <form action={moderateAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="decision" value="approve" />
            <button className={buttonClass}>Одобрить</button>
          </form>
          <form action={moderateAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="decision" value="reject" />
            <input name="reason" placeholder="Причина" className={inputClass} />
            <button className={secondaryClass}>Отклонить</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
