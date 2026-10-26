import Link from "next/link";
import { ProductGrid } from "@/components/catalog-ui";
import { homeRails } from "@/lib/catalog";

export default async function HomePage() {
  const rails = await homeRails();
  const roots = rails.categories.filter((category) => category.parentId === null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="grid gap-3">
        {roots.map((root) => {
          const children = rails.categories
            .filter((category) => category.parentId === root.id)
            .sort((a, b) => a.sort - b.sort);
          return (
            <div key={root.id} className="rounded-3xl border border-line bg-card p-4">
              <Link href={`/catalog?category=${root.slug}`} className="font-display text-lg hover:text-copper">
                {root.name}
              </Link>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {children.map((child) => {
                  const nested = rails.categories
                    .filter((category) => category.parentId === child.id)
                    .sort((a, b) => a.sort - b.sort);
                  if (nested.length === 0) {
                    return (
                      <Link
                        key={child.id}
                        href={`/catalog?category=${child.slug}`}
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-navy"
                      >
                        {child.name}
                      </Link>
                    );
                  }
                  return (
                    <div key={child.id}>
                      <Link href={`/catalog?category=${child.slug}`} className="text-sm font-semibold hover:text-copper">
                        {child.name}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {nested.map((leaf) => (
                          <Link
                            key={leaf.id}
                            href={`/catalog?category=${leaf.slug}`}
                            className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-navy"
                          >
                            {leaf.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
      <Rail title="Новые поступления" href="/catalog?sort=new" items={rails.fresh} />
      <Rail title="Частные объявления" href="/catalog?source=individual" items={rails.privateItems} />
    </main>
  );
}

function Rail({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: Parameters<typeof ProductGrid>[0]["items"];
}) {
  return (
    <section className="py-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-2xl">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-copper">
          Все
        </Link>
      </div>
      <ProductGrid items={items} />
    </section>
  );
}
