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
  filters,
  children,
}: {
  categories: CategoryNode[];
  activeSlug: string;
  search: string;
  paths: Record<string, string>;
  filters?: ReactNode;
  children: ReactNode;
}) {
  const active = categories.find((item) => item.slug === activeSlug);
  const chain = categoryChain(categories, activeSlug || undefined);
  const chainIds = new Set(chain.map((item) => item.id));
  const branch = chain[0] ? childrenOf(categories, chain[0].id) : [];
  const mobile = mobileRow(categories, active);

  return (
    <>
      {mobile.items.length > 0 ? (
        <nav className="mb-3 md:hidden" aria-label="Подразделы">
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
      <div className="md:grid md:grid-cols-[17rem_minmax(0,1fr)] md:items-start md:gap-6">
        <aside className="mb-4 grid min-w-0 gap-4 md:sticky md:top-32 md:mb-0 md:flex md:max-h-[calc(100vh-9rem)] md:flex-col md:overflow-hidden">
          {branch.length > 0 ? (
            <nav className="hidden shrink-0 bg-white p-4 md:block" aria-label="Подразделы">
              <ul>
                {branch.map((item) => (
                  <SectionBranch key={item.id} categories={categories} node={item} depth={0} activeSlug={activeSlug} chainIds={chainIds} search={search} paths={paths} />
                ))}
              </ul>
            </nav>
          ) : null}
          {filters}
        </aside>
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
        className={`block truncate py-1.5 text-sm hover:text-navy ${current ? "font-semibold text-deep" : "text-navy"}`}
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
  if (!active) return { showUp: false, up: null as string | null, items: [] };
  if (active.parentId == null) {
    return { showUp: false, up: null as string | null, items: childrenOf(categories, active.id) };
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
