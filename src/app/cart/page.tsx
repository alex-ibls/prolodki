import Link from "next/link";
import { updateCartAction } from "@/actions/store";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, secondaryClass } from "@/components/styles";
import { getCartView } from "@/lib/cart";
import { formatRub } from "@/lib/format";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Корзина" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  const { items } = await getCartView();
  const total = items.reduce((sum, item) => sum + item.listing.priceKopeks * item.qty, 0);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl">Корзина</h1>
      <ErrorNote message={one("error")} />
      {items.length === 0 ? (
        <p className="mt-6 text-muted">
          Пока пусто. <Link href="/catalog">Открыть каталог</Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.listingId} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/product/${item.listing.slug}`} className="font-display text-lg">
                    {item.listing.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatRub(item.listing.priceKopeks)} · доступно {item.listing.quantity}
                  </p>
                </div>
                <p className="font-semibold">{formatRub(item.listing.priceKopeks * item.qty)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <form action={updateCartAction} className="flex gap-2">
                  <input type="hidden" name="listingId" value={item.listingId} />
                  <input
                    name="qty"
                    type="number"
                    min={1}
                    max={Math.max(item.listing.quantity, 1)}
                    defaultValue={item.qty}
                    className="w-20 rounded-xl border border-line px-3 py-2"
                  />
                  <button className={secondaryClass}>Обновить</button>
                </form>
                <form action={updateCartAction}>
                  <input type="hidden" name="listingId" value={item.listingId} />
                  <input type="hidden" name="intent" value="remove" />
                  <button className={secondaryClass}>Удалить</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xl font-semibold">{formatRub(total)}</p>
          <Link href="/checkout" className={buttonClass}>
            Оформить
          </Link>
        </div>
      ) : null}
    </main>
  );
}
