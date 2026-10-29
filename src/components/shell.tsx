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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap">
          <Link href="/" className="mr-auto shrink-0 font-display text-xl tracking-wide text-navy lg:mr-0">
            {site.name}
          </Link>
          <div className="order-last w-full lg:order-none lg:min-w-56 lg:flex-1">
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
