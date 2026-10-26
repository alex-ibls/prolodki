import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { buttonClass } from "@/components/styles";
import { listingStats } from "@/lib/activity";
import { formatRub } from "@/lib/format";
import { listingStatusLabel } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Объявления" };

export default async function ListingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.sellerProfile) {
    return (
      <main>
        <h1 className="text-3xl">Объявления</h1>
        <p className="mt-3 text-muted">Чтобы продавать БУ, включите режим частного продавца в профиле.</p>
        <Link href="/account" className={`${buttonClass} mt-4`}>
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
        <h1 className="text-3xl">Объявления</h1>
        <Link href="/account/listings/new" className={buttonClass}>
          Новое
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/account/listings/${row.id}`} className="block rounded-3xl border border-line bg-card p-4">
              <span className="font-display">{row.title}</span>
              <span className="ml-3 text-sm text-muted">
                {listingStatusLabel[row.status]} · {formatRub(row.priceKopeks)}
              </span>
              <p className="mt-2 text-sm text-muted">
                Просмотры {stats.get(row.id)?.view ?? 0} · в избранном {stats.get(row.id)?.favorite ?? 0} · в корзину{" "}
                {stats.get(row.id)?.cart_add ?? 0} · телефон {stats.get(row.id)?.phone_reveal ?? 0}
              </p>
              {row.rejectionReason ? <p className="mt-2 text-sm text-red-700">Причина: {row.rejectionReason}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
