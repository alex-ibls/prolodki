import Link from "next/link";
import type { ReactNode } from "react";
import { catalogHref } from "@/lib/sef";
import { childrenOf, categoryChain, type CategoryNode } from "@/lib/taxonomy";

const scroll =
  "-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-4 sm:px-4 [&::-webkit-scrollbar]:hidden";

export function CatalogSections({
  categories,
  activeSlug,
  search,
  paths,
  children,
}: {
  categories: CategoryNode[];
  activeSlug: string;
  search: string;
  paths: Record<string, string>;
  children: ReactNode;
}) {
  const active = categories.find((item) => item.slug === activeSlug);
  const chain = categoryChain(categories, activeSlug || undefined);
  const chainIds = new Set(chain.map((item) => item.id));
  const roots = childrenOf(categories, null);
  const branch = chain[0] ? childrenOf(categories, chain[0].id) : [];
  const mobile = mobileRow(categories, active);

  return (
    <>
      <nav className="mb-4 grid grid-cols-2 gap-2 sm:gap-3" aria-label="Главные разделы">
        {roots.map((item) => {
          const on = chainIds.has(item.id);
          return (
            <Link
              key={item.id}
              href={sectionHref(search, item.slug, paths)}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-16 items-end rounded-2xl border px-3 py-3 text-sm font-semibold sm:min-h-20 sm:px-4 sm:text-base ${on ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy"}`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      {mobile.items.length > 0 ? (
        <nav className="mb-3 lg:hidden" aria-label="Подразделы">
          <div className={scroll}>
            {mobile.showUp ? (
              <Link href={sectionHref(search, mobile.up, paths)} className="tag shrink-0 whitespace-nowrap border border-line bg-white px-3 py-1.5 text-sm text-ink">
                Все
              </Link>
            ) : null}
            {mobile.items.map((item) => {
              const on = item.slug === activeSlug;
              return (
                <Link
                  key={item.id}
                  href={sectionHref(search, item.slug, paths)}
                  aria-current={on ? "page" : undefined}
                  className={`tag shrink-0 whitespace-nowrap border px-3 py-1.5 text-sm ${on ? "border-navy bg-navy font-semibold text-white" : "border-line bg-white text-ink"}`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      <div className={branch.length > 0 ? "lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8" : ""}>
        {branch.length > 0 ? (
          <nav className="mb-4 hidden lg:sticky lg:top-20 lg:mb-0 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto" aria-label="Подразделы">
            <ul>
              {branch.map((item) => (
                <SectionBranch key={item.id} categories={categories} node={item} depth={0} activeSlug={activeSlug} chainIds={chainIds} search={search} paths={paths} />
              ))}
            </ul>
          </nav>
        ) : null}
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}

function SectionBranch({
  categories,
  node,
  depth,
  activeSlug,
  chainIds,
  search,
  paths,
}: {
  categories: CategoryNode[];
  node: CategoryNode;
  depth: number;
  activeSlug: string;
  chainIds: Set<number>;
  search: string;
  paths: Record<string, string>;
}) {
  const kids = childrenOf(categories, node.id);
  const current = node.slug === activeSlug;
  return (
    <li>
      <Link
        href={sectionHref(search, node.slug, paths)}
        aria-current={current ? "page" : undefined}
        className={`block truncate py-1.5 text-sm hover:text-navy ${current ? "font-semibold text-navy" : "text-ink"}`}
        style={{ paddingLeft: depth * 12 }}
      >
        {node.name}
      </Link>
      {chainIds.has(node.id) && kids.length > 0 ? (
        <ul>
          {kids.map((item) => (
            <SectionBranch
              key={item.id}
              categories={categories}
              node={item}
              depth={depth + 1}
              activeSlug={activeSlug}
              chainIds={chainIds}
              search={search}
              paths={paths}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function mobileRow(categories: CategoryNode[], active: CategoryNode | undefined) {
  if (!active || active.parentId == null) {
    const kids = active ? childrenOf(categories, active.id) : [];
    return { showUp: false, up: null as string | null, items: kids };
  }
  const kids = childrenOf(categories, active.id);
  const parent = categories.find((item) => item.id === active.parentId);
  if (kids.length > 0) return { showUp: true, up: parent?.slug ?? null, items: kids };
  return { showUp: true, up: parent?.slug ?? null, items: childrenOf(categories, active.parentId) };
}

function sectionHref(search: string, slug: string | null, paths: Record<string, string>) {
  const next = new URLSearchParams(search);
  next.delete("page");
  if (slug) next.set("category", slug);
  else next.delete("category");
  return catalogHref(next, paths);
}
