import Link from "next/link";
import { checkoutAction } from "@/actions/store";
import { ErrorNote } from "@/components/catalog-ui";
import { actionClass, inputClass, pageFrame, panelClass } from "@/components/styles";
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
      }));
      return {
        ...item,
        unit: item.listing.priceKopeks + quote.extraKopeks,
        names: quote.names,
        lead: deliveryTerm(item.listing.quantity),
      };
    }),
  );
  const privateItems = priced.filter((item) => item.listing.source === "individual");
  const orderable = priced.filter((item) => item.listing.source !== "individual");
  const total = orderable.reduce((sum, item) => sum + item.unit * item.qty, 0);
  return (
    <main className={`${pageFrame} max-w-6xl`}>
      <div className="max-w-xl">
      <h1 className="text-3xl">Оформление</h1>
      <p className="mt-2 text-sm text-muted">
        Онлайн-оплаты нет. Способ оплаты фиксируется в заказе: счёт, наличные или по договорённости.
      </p>
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
      {orderable.length === 0 ? <p className="mt-4 text-sm text-muted">Сначала выберите лодку и нажмите «Купить» или «Заказать».</p> : null}
      {privateItems.length > 0 ? (
        <p className="mt-4 text-sm">Частное объявление заказом не оформляется. Напишите продавцу.</p>
      ) : null}
      {orderable.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {orderable.map((item) => (
            <li key={item.listingId}>
              <p className="font-semibold">{item.listing.title}</p>
              {item.names.length ? <p className="text-sm text-muted">{item.names.join(", ")}</p> : null}
              <p className="text-sm text-muted">
                {item.qty > 1 ? `${item.qty} × ${formatRub(item.unit)} · ` : `${formatRub(item.unit)} · `}
                срок поставки {item.lead}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-lg">К оплате {formatRub(total)}</p>
      <form action={checkoutAction} className={`${panelClass} mt-4 grid gap-3`}>
        <label className="text-sm">
          Имя
          <input name="contactName" required defaultValue={user?.name ?? ""} className={inputClass} />
        </label>
        <label className="text-sm">
          Телефон
          <input name="phone" required defaultValue={user?.phone ?? ""} className={inputClass} />
        </label>
        <label className="text-sm">
          Город
          <input name="city" defaultValue={user?.city ?? ""} className={inputClass} />
        </label>
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
        <label className="text-sm">
          Комментарий
          <textarea name="comment" rows={3} className={inputClass} />
        </label>
        <button className={actionClass} disabled={orderable.length === 0 || privateItems.length > 0}>
          Подтвердить заказ
        </button>
      </form>
      </div>
    </main>
  );
}
