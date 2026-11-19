import Link from "next/link";
import { updateCartAction } from "@/actions/store";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, secondaryClass } from "@/components/styles";
import { getCartView } from "@/lib/cart";
import { deliveryTerm, formatRub } from "@/lib/format";
import { quoteKit } from "@/lib/kit";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Корзина" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  const { items } = await getCartView();
  const priced = await Promise.all(
    items.map(async (item) => {
      const quote = await quoteKit(item.listing.nomenclatureId, item.options).catch(() => ({
        extraKopeks: 0,
        names: [] as string[],
        ids: [] as string[],
      }));
      return { ...item, unit: item.listing.priceKopeks + quote.extraKopeks, names: quote.names };
    }),
  );
  const privateItems = priced.filter((item) => item.listing.source === "individual");
  const orderable = priced.filter((item) => item.listing.source !== "individual");
  const total = orderable.reduce((sum, item) => sum + item.unit * item.qty, 0);
  return (
    <main className="mx-auto max-w-3xl px-4 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl">Корзина</h1>
      <ErrorNote message={one("error")} />
      {priced.length === 0 ? (
        <p className="mt-6 text-muted">
          Пока пусто. <Link href="/">На главную</Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {priced.map((item) => (
            <li key={item.listingId} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/product/${item.listing.slug}`} className="font-display text-base leading-snug sm:text-lg">
                    {item.listing.title}
                  </Link>
                  <p className="text-sm text-muted">
                    {item.listing.source === "individual"
                      ? "Частное объявление не оформляется заказом. Напишите продавцу и удалите позицию."
                      : `${formatRub(item.unit)} · срок поставки ${deliveryTerm(item.listing.quantity, item.listing.leadTime)}`}
                  </p>
                  {item.names.length ? <p className="text-sm text-muted">{item.names.join(", ")}</p> : null}
                </div>
                <p className="shrink-0 font-semibold">{formatRub(item.unit * item.qty)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.listing.source === "individual" ? null : (
                  <form action={updateCartAction} className="flex gap-2">
                    <input type="hidden" name="listingId" value={item.listingId} />
                    <input
                      name="qty"
                      type="number"
                      min={1}
                      defaultValue={item.qty}
                      className="field w-20 border border-line px-3 py-2"
                    />
                    <button className={secondaryClass}>Обновить</button>
                  </form>
                )}
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
      {orderable.length > 0 && privateItems.length === 0 ? (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xl font-semibold">{formatRub(total)}</p>
          <Link href="/checkout" className={buttonClass}>
            Оформить
          </Link>
        </div>
      ) : null}
      {privateItems.length > 0 ? (
        <p className="mt-6 text-sm text-muted">Оформление откроется, когда в корзине останутся только товары компании.</p>
      ) : null}
    </main>
  );
}
