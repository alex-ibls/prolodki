import { ProductGrid, listingCard } from "@/components/catalog-ui";
import { viewedListings } from "@/lib/activity";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "История" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const items = await viewedListings();
  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
      <h1 className="text-3xl">История просмотров</h1>
      {user ? <p className="mt-2 text-sm text-muted">Список хранится в аккаунте.</p> : null}
      {items.length === 0 ? (
        <p className="mt-6 text-muted">Вы ещё ничего не смотрели.</p>
      ) : (
        <div className="mt-4">
          <ProductGrid items={items.map(listingCard)} />
        </div>
      )}
    </main>
  );
}
