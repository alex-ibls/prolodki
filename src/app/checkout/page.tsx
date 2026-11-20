import Link from "next/link";
import { checkoutAction, updateCartAction } from "@/actions/store";
import { ErrorNote } from "@/components/catalog-ui";
import { actionClass, inputClass, pageFrame, panelClass, secondaryClass } from "@/components/styles";
import { getCartView } from "@/lib/cart";
import { deliveryTerm, formatRub } from "@/lib/format";
import { quoteKit } from "@/lib/kit";
import { readQuery } from "@/lib/query";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Оформление" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  const user = await getCurrentUser();
  const { items } = await getCartView();
  const priced = await Promise.all(
    items.map(async (item) => {
      const quote = await quoteKit(item.listing.nomenclatureId, item.options).catch(() => ({
        extraKopeks: 0,
        names: [] as string[],
        ids: [] as string[],
        lines: [] as { name: string; priceKopeks: number }[],
      }));
      return {
        ...item,
        base: item.listing.priceKopeks,
        unit: item.listing.priceKopeks + quote.extraKopeks,
        lines: quote.lines,
        optionsTotal: quote.extraKopeks,
        lead: deliveryTerm(item.listing.quantity),
      };
    }),
  );
  const privateItems = priced.filter((item) => item.listing.source === "individual");
  const orderable = priced.filter((item) => item.listing.source !== "individual");
  const total = orderable.reduce((sum, item) => sum + item.unit * item.qty, 0);
  return (
    <main className={`${pageFrame} max-w-6xl`}>
      <h1 className="text-3xl">Оформление</h1>
      {user ? null : (
        <p className="mt-2 text-sm">
          Регистрация не нужна.{" "}
          <Link href="/login?next=/checkout" className="font-semibold">
            Войти
          </Link>
          , если аккаунт уже есть.
        </p>
      )}
      <ErrorNote message={one("error")} />
      {orderable.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Выберите комплектацию лодки. Черновик заказа появится здесь и останется, пока его не оформите или не отмените.</p>
      ) : null}
      {privateItems.length > 0 ? (
        <p className="mt-4 text-sm">Частный товар заказом не оформляется. Напишите продавцу.</p>
      ) : null}
      <div className="mt-4 grid gap-4">
      {orderable.length > 0 ? (
        <div className="grid gap-3">
          {orderable.map((item) => (
            <section key={item.listingId} className={`${panelClass} flex flex-col`}>
              <h2 className="text-base font-semibold text-deep">Расчёт стоимости</h2>
              <p className="mt-3 font-semibold">{item.listing.title}</p>
              <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
                <div className="flex items-start justify-between gap-3 py-2">
                  <dt>Базовая цена</dt>
                  <dd className="shrink-0 font-medium text-deep">{formatRub(item.base)}</dd>
                </div>
                {item.lines.length ? (
                  <div className="py-2">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-2">
                          Доп. оборудование и комплектация
                          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-moss transition-transform group-open:rotate-90" aria-hidden>
                            <path d="M3 1.5 10 6 3 10.5Z" fill="currentColor" />
                          </svg>
                        </span>
                        <span className="shrink-0 text-muted">{item.optionsTotal > 0 ? `+ ${formatRub(item.optionsTotal)}` : "без доплаты"}</span>
                      </summary>
                      <div className="mt-2 grid divide-y divide-line border-t border-line">
                        {item.lines.map((line, index) => (
                          <div key={`${item.listingId}-${index}`} className="flex items-start justify-between gap-3 py-2">
                            <span>{line.name}</span>
                            <span className="shrink-0 text-muted">{line.priceKopeks > 0 ? `+ ${formatRub(line.priceKopeks)}` : "без доплаты"}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : null}
                {item.qty > 1 ? (
                  <div className="flex items-start justify-between gap-3 py-2">
                    <dt>Количество</dt>
                    <dd className="shrink-0 text-muted">
                      {item.qty} × {formatRub(item.unit)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-3 py-2">
                  <dt className="text-muted">Срок поставки</dt>
                  <dd className="shrink-0 font-medium text-deep">{item.lead}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <p className="text-2xl font-bold text-deep">{formatRub(item.unit * item.qty)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/product/${item.listing.slug}`} className={secondaryClass}>
                    Изменить заказ
                  </Link>
                  <form action={updateCartAction}>
                    <input type="hidden" name="listingId" value={item.listingId} />
                    <input type="hidden" name="intent" value="remove" />
                    <button className={secondaryClass}>Отменить</button>
                  </form>
                </div>
              </div>
            </section>
          ))}
          {orderable.length > 1 ? <p className="text-lg">К оплате {formatRub(total)}</p> : null}
        </div>
      ) : null}
      <form action={checkoutAction} className={`${panelClass} grid w-full divide-y divide-line`}>
        <div className="grid gap-3 pb-3 sm:grid-cols-2">
          <label className="text-sm">
            Имя
            <input name="contactName" required defaultValue={user?.name ?? ""} className={inputClass} />
          </label>
          <label className="text-sm">
            Телефон
            <input name="phone" required defaultValue={user?.phone ?? ""} className={inputClass} />
          </label>
        </div>
        <div className="py-3">
          <label className="text-sm">
            Город
            <input name="city" defaultValue={user?.city ?? ""} className={inputClass} />
          </label>
        </div>
        <div className="grid gap-3 py-3 sm:grid-cols-2">
          <label className="text-sm">
            Оплата
            <select name="paymentMethod" className={inputClass} defaultValue="invoice">
              <option value="invoice">Счёт</option>
              <option value="cash">Наличные</option>
              <option value="agreement">По договорённости</option>
            </select>
          </label>
          <label className="text-sm">
            Получение
            <select name="fulfillment" className={inputClass} defaultValue="pickup">
              <option value="pickup">Самовывоз</option>
              <option value="delivery_agreed">Доставка по договорённости</option>
            </select>
          </label>
        </div>
        <div className="py-3">
          <label className="text-sm">
            Комментарий
            <textarea name="comment" rows={3} className={inputClass} />
          </label>
        </div>
        <label className="flex items-start gap-2 py-3 text-sm">
          <input name="consent" type="checkbox" value="yes" required className="mt-1 accent-moss" />
          <span>
            Даю согласие на обработку персональных данных для оформления заказа в соответствии с{" "}
            <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold underline">
              политикой конфиденциальности
            </Link>
            .
          </span>
        </label>
        <div className="pt-3">
          <button className={actionClass} disabled={orderable.length === 0 || privateItems.length > 0}>
            Подтвердить заказ
          </button>
        </div>
      </form>
      </div>
    </main>
  );
}
