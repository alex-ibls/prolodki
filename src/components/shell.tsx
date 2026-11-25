import Link from "next/link";
import { Suspense } from "react";
import { CompareNavLink } from "@/components/compare-ui";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { CatalogSearch } from "@/components/catalog-search";
import { UserMenu } from "@/components/user-menu";
import { cartLinkClass } from "@/components/styles";
import { cartCount } from "@/lib/cart";
import { allCategories } from "@/lib/catalog";
import { categoryPathMap } from "@/lib/sef";
import { withoutDemo } from "@/lib/taxonomy";
import { site } from "@/lib/site";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const count = await cartCount();
  const paths = categoryPathMap(withoutDemo(await allCategories()));
  const bar = [
    { href: "/", label: "Главная" },
    { href: "/favorites", label: "Избранное" },
    { href: "/history", label: "История" },
    { href: user ? "/account/orders" : "/orders", label: "Заказы" },
    { href: user ? "/account" : "/login", label: user ? "Кабинет" : "Войти" },
  ];
  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
            <Link
              href="/"
              aria-label={`${site.name}, ${site.domain}`}
              className="shrink-0 rounded-xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
            >
              <Logo />
            </Link>
            <div className="min-w-0 flex-1">
              <CatalogSearch paths={paths} />
            </div>
            <div className="hidden items-center gap-4 text-sm text-ink lg:flex">
              <a href={`tel:${site.phoneHref}`} className="leading-tight">
                <span className="block text-xs text-muted">Наш телефон</span>
                <span className="font-semibold">{site.phone}</span>
              </a>
              <a href={`mailto:${site.email}`} className="leading-tight">
                <span className="block text-xs text-muted">Наш email</span>
                <span className="font-semibold">{site.email}</span>
              </a>
            </div>
            <UserMenu cartCount={count} loggedIn={Boolean(user)} staffRole={user?.staffRole ?? null} />
          </div>
        </div>
        <div className="hidden bg-deep text-white md:block">
          <div className="mx-auto flex max-w-6xl items-stretch px-3 sm:px-4">
            <nav className="flex min-w-0 items-center gap-1" aria-label="Разделы сайта">
              {bar.map((item) => (
                <Link key={item.href} href={item.href} className="px-3 py-3 text-sm text-white/90 hover:text-white">
                  {item.label}
                </Link>
              ))}
              <CompareNavLink className="px-3 py-3 text-sm text-white/90 hover:text-white" />
            </nav>
            <Link href="/cart" className={`${cartLinkClass} ml-auto`}>
              <CartGlyph />
              Корзина{count > 0 ? ` (${count})` : ""}
            </Link>
          </div>
        </div>
      </header>
      <MobileNav cartCount={count} loggedIn={Boolean(user)} />
    </>
  );
}

function CartGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 7h12l-1 12H7L6 7z" />
      <path d="M9 7V6a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

export function HeaderFallback() {
  return (
    <header>
      <div className="h-28 border-b border-line bg-white" />
    </header>
  );
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
    <footer className="mt-auto border-t border-line bg-white pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] text-ink lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-6 text-sm sm:px-4 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-muted">{site.tagline}</p>
        </div>
        <div>
          <a href={`tel:${site.phoneHref}`} className="font-semibold text-deep">
            {site.phone}
          </a>
          <p className="mt-1">{site.email}</p>
          <p className="mt-1 text-muted">{site.hours}</p>
        </div>
        <div>
          <p>{site.address}</p>
          <Link href="/privacy" className="mt-2 inline-block text-muted hover:text-deep">
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}
