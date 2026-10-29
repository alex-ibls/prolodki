import Link from "next/link";
import { checkoutAction } from "@/actions/store";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, panelClass } from "@/components/styles";
import { getCartView } from "@/lib/cart";
import { formatRub } from "@/lib/format";
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
  const total = items.reduce((sum, item) => sum + item.listing.priceKopeks * item.qty, 0);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
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
        <button className={buttonClass} disabled={items.length === 0}>
          Подтвердить заказ
        </button>
      </form>
    </main>
  );
}
