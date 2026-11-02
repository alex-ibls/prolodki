import Link from "next/link";
import { toggleFavoriteAction } from "@/actions/activity";
import { secondaryClass } from "@/components/styles";
import { favoriteListings } from "@/lib/activity";
import { formatOffer } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Избранное" };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  const items = await favoriteListings();
  return (
    <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl">Избранное</h1>
      {user ? <p className="mt-2 text-sm text-muted">Список хранится в аккаунте.</p> : null}
      {items.length === 0 ? <p className="mt-6 text-muted">Пока пусто.</p> : null}
      <ul className="mt-4 space-y-4">
        {items.map((item) => {
          const photo = item.images[0]?.path;
          return (
            <li key={item.id} className="flex items-center gap-3">
              <Link href={`/product/${item.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${photo}`} alt="" className="h-16 w-16 shrink-0 rounded-[12px] object-cover" />
                ) : (
                  <span className="h-16 w-16 shrink-0 rounded-[12px] bg-[#ececec]" />
                )}
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-5 text-[#141414]">{formatOffer(item.priceKopeks)}</span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] leading-4 text-[#141414]">{item.title}</span>
                </span>
              </Link>
              <form action={toggleFavoriteAction}>
                <input type="hidden" name="listingId" value={item.id} />
                <input type="hidden" name="back" value="/favorites" />
                <button className={secondaryClass}>Убрать</button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
