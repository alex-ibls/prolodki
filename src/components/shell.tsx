import Link from "next/link";
import { Suspense } from "react";
import { MobileNav } from "@/components/mobile-nav";
import { TagSearch } from "@/components/tag-search";
import { UserMenu } from "@/components/user-menu";
import { cartCount } from "@/lib/cart";
import { catalogFilters, catalogTags } from "@/lib/catalog";
import { site } from "@/lib/site";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const count = await cartCount();
  const [tags, filters] = await Promise.all([catalogTags(), catalogFilters()]);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white text-ink">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <Link href="/" className="shrink-0 font-display text-lg tracking-wide text-navy sm:text-xl">
            {site.name}
          </Link>
          <div className="min-w-0 flex-1">
            <TagSearch tags={tags} filters={filters} />
          </div>
          <UserMenu cartCount={count} loggedIn={Boolean(user)} staffRole={user?.staffRole ?? null} />
        </div>
      </header>
      <MobileNav cartCount={count} loggedIn={Boolean(user)} />
    </>
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
      <div className="mx-auto grid max-w-6xl gap-3 px-3 py-5 text-sm text-muted sm:px-4 sm:py-8 md:grid-cols-3">
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
