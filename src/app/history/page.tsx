import { ProductGrid, listingCard } from "@/components/catalog-ui";
import { pageFrame } from "@/components/styles";
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
    <main className={`${pageFrame} max-w-6xl`}>
      <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">История просмотров</h1>
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
