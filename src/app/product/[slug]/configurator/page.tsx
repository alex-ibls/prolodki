import { notFound } from "next/navigation";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ErrorNote } from "@/components/catalog-ui";
import { ProductKit } from "@/components/product-kit";
import { isFavorite } from "@/lib/activity";
import { getPublishedListing } from "@/lib/catalog";
import { kitForNomenclature } from "@/lib/kit";
import { deliveryTerm } from "@/lib/format";
import { readQuery } from "@/lib/query";

export default async function ConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { one } = await readQuery(searchParams);
  const item = await getPublishedListing(slug);
  if (!item?.nomenclatureId || item.source !== "company") notFound();
  const kit = await kitForNomenclature(item.nomenclatureId);
  const saved = await isFavorite(item.id);
  if (kit.length === 0) notFound();
  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-8">
      <CrumbTitle label={item.title} href={`/product/${item.slug}`} />
      <h1 className="text-xl leading-6 sm:text-2xl">{item.title}</h1>
      <p className="mt-1 text-sm text-muted">Конфигуратор</p>
      <ErrorNote message={one("error")} />
      <div className="mt-6">
        <ProductKit
          groups={kit}
          baseKopeks={item.priceKopeks}
          listingId={item.id}
          slug={item.slug}
          maxQty={item.quantity}
          leadTime={deliveryTerm(item.quantity, item.leadTime)}
          imagePath={item.images[0]?.path ?? ""}
          title={item.title}
          saved={saved}
        />
      </div>
    </main>
  );
}
