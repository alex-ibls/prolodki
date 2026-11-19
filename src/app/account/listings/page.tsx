import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { actionClass } from "@/components/styles";
import { listingStats } from "@/lib/activity";
import { formatRub } from "@/lib/format";
import { listingStatusLabel } from "@/lib/labels";
import { buyerListingsEnabled, ensureIndividualSeller } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Товары" };

export default async function ListingsPage() {
  if (!buyerListingsEnabled) redirect("/account");
  const current = await getCurrentUser();
  if (!current) return null;
  const user = await ensureIndividualSeller(current);
  if (!user.emailVerifiedAt || !user.sellerProfile) {
    return (
      <main>
        <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">Товары</h1>
        <p className="mt-3 text-muted">Чтобы разместить товар, подтвердите email в профиле.</p>
        <Link href="/account" className={`${actionClass} mt-4`}>
          К профилю
        </Link>
      </main>
    );
  }
  const rows = await db.query.listings.findMany({
    where: eq(listings.sellerUserId, user.id),
    orderBy: desc(listings.updatedAt),
  });
  const stats = await listingStats(rows.map((row) => row.id));
  return (
    <main>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">Товары</h1>
        <Link href="/account/listings/new" className={actionClass}>
          Новое
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/account/listings/${row.id}`} className="block rounded-3xl border border-line bg-card p-4">
              <span className="font-display font-semibold text-deep">{row.title}</span>
              <span className="ml-3 text-sm text-muted">
                {listingStatusLabel[row.status]} · {formatRub(row.priceKopeks)}
              </span>
              <p className="mt-2 text-sm text-muted">
                Просмотры {stats.get(row.id)?.view ?? 0} · в избранном {stats.get(row.id)?.favorite ?? 0} · телефон{" "}
                {stats.get(row.id)?.phone_reveal ?? 0}
              </p>
              {row.rejectionReason ? <p className="mt-2 text-sm text-red-700">Причина: {row.rejectionReason}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
