import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { CatalogSearch } from "@/components/catalog-search";
import { UserMenu } from "@/components/user-menu";
import { brandBarClass } from "@/components/styles";
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
  return (
    <>
      <header className="sticky top-0 z-40 text-white">
        <div className={brandBarClass}>
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <Link
              href="/"
              aria-label={`${site.name}, ${site.domain}`}
              className="shrink-0 rounded-xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7ad7ff]"
            >
              <Logo />
            </Link>
            <div className="min-w-0 flex-1">
              <CatalogSearch paths={paths} />
            </div>
            <UserMenu cartCount={count} loggedIn={Boolean(user)} staffRole={user?.staffRole ?? null} />
          </div>
        </div>
      </header>
      <MobileNav cartCount={count} loggedIn={Boolean(user)} />
    </>
  );
}

export function HeaderFallback() {
  return (
    <header>
      <div className={`${brandBarClass} h-16`} />
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
    <footer className={`${brandBarClass} mt-auto border-t border-white/15 pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] lg:pb-0`}>
      <div className="mx-auto grid max-w-6xl gap-4 px-3 py-6 text-sm sm:px-4 sm:py-8 md:grid-cols-3">
        <div>
          <Logo domain="always" />
          <p className="mt-3 text-white/80">{site.tagline}</p>
        </div>
        <div className="text-white/85">
          <a href={`tel:${site.phoneHref}`} className="font-semibold text-white">
            {site.phone}
          </a>
          <p className="mt-1">{site.email}</p>
          <p className="mt-1">{site.hours}</p>
        </div>
        <p className="text-white/85">{site.address}</p>
      </div>
    </footer>
  );
}
