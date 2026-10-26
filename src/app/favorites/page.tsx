import Link from "next/link";
import { toggleFavoriteAction } from "@/actions/activity";
import { secondaryClass } from "@/components/styles";
import { favoriteListings } from "@/lib/activity";
import { formatRub } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Избранное" };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const items = await favoriteListings();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl">Избранное</h1>
      <p className="mt-2 text-sm text-muted">
        {user ? "Список хранится в аккаунте." : "Список хранится в этом браузере год."}
      </p>
      {items.length === 0 ? <p className="mt-6 text-muted">Пока пусто.</p> : null}
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-card p-4">
            <div>
              <Link href={`/product/${item.slug}`} className="font-display text-lg">
                {item.title}
              </Link>
              <p className="text-sm text-muted">{formatRub(item.priceKopeks)}</p>
            </div>
            <form action={toggleFavoriteAction}>
              <input type="hidden" name="listingId" value={item.id} />
              <input type="hidden" name="back" value="/favorites" />
              <button className={secondaryClass}>Убрать</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
