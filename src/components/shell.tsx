import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/actions/store";
import { cartCount } from "@/lib/cart";
import { site } from "@/lib/site";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const count = await cartCount();
  return (
    <header className="border-b border-line bg-white text-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="font-display text-xl tracking-wide text-navy">
          {site.name}
        </Link>
        <form action="/catalog" className="min-w-48 flex-1">
          <input
            name="q"
            placeholder="Поиск по технике"
            className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink outline-none focus:border-navy"
          />
        </form>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/catalog">Каталог</Link>
          <Link href="/favorites">Избранное</Link>
          <Link href="/cart">Корзина{count > 0 ? ` (${count})` : ""}</Link>
          <Link href={user ? "/account/orders" : "/orders"}>Заказы</Link>
          <Link href={user ? "/account/messages" : "/messages"}>Сообщения</Link>
          {user?.staffRole === "manager" ? <Link href="/admin/crm">CRM</Link> : null}
          {user?.staffRole === "manager" ? <Link href="/admin/nomenclature">Склад</Link> : null}
          {user?.staffRole === "moderator" || user?.staffRole === "manager" ? (
            <Link href="/admin/moderation">Модерация</Link>
          ) : null}
          {user ? <Link href="/account">Кабинет</Link> : <Link href="/login">Войти</Link>}
        </nav>
        {user ? (
          <form action={logoutAction}>
            <button className="text-sm text-muted" type="submit">
              Выйти
            </button>
          </form>
        ) : null}
      </div>
    </header>
  );
}

export function HeaderFallback() {
  return <header className="h-16 border-b border-line bg-white" />;
}

export function SiteHeaderSlot() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <SiteHeader />
    </Suspense>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-sm text-muted md:grid-cols-3">
        <div>
          <p className="font-display text-base text-ink">{site.name}</p>
          <p>{site.address}</p>
        </div>
        <div>
          <a href={`tel:${site.phoneHref}`}>{site.phone}</a>
          <p>{site.email}</p>
        </div>
        <p>{site.hours}</p>
      </div>
    </footer>
  );
}
