import { ProductGrid, listingCard } from "@/components/catalog-ui";
import { viewedListings } from "@/lib/activity";
import { allCategories } from "@/lib/catalog";
import { categoryPathMap } from "@/lib/sef";
import { getCurrentUser } from "@/lib/session";
import { withoutDemo } from "@/lib/taxonomy";

export const metadata = { title: "История" };

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const items = await viewedListings();
  const paths = categoryPathMap(withoutDemo(await allCategories()));
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl">История просмотров</h1>
      {user ? <p className="mt-2 text-sm text-muted">Список хранится в аккаунте.</p> : null}
      {items.length === 0 ? (
        <p className="mt-6 text-muted">Вы ещё ничего не смотрели.</p>
      ) : (
        <div className="mt-4">
          <ProductGrid items={items.map((item) => listingCard(item, paths))} />
        </div>
      )}
    </main>
  );
}
