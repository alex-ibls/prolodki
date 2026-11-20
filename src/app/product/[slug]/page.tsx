import { notFound } from "next/navigation";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product-gallery";
import { YandexPlaceMap } from "@/components/yandex-place-map";
import { ErrorNote, HighlightSpecs, highlightSpecs, SpecGrid, specsOf, specValue } from "@/components/catalog-ui";
import { TrackView } from "@/components/track-view";
import { KitProvider, ProductCost, ProductGroups, productSectionClass } from "@/components/product-kit";
import { pageFrame } from "@/components/styles";
import { isFavorite } from "@/lib/activity";
import { getPublishedListing } from "@/lib/catalog";
import { deliveryTerm, formatRub } from "@/lib/format";
import { readQuery } from "@/lib/query";
import { cartOptionsForListing } from "@/lib/cart";
import { kitForNomenclature } from "@/lib/kit";
import { catalogHref } from "@/lib/sef";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { one } = await readQuery(searchParams);
  const item = await getPublishedListing(slug);
  if (!item) notFound();
  const saved = await isFavorite(item.id);
  const highlights = highlightSpecs(item);
  const kit = item.source === "company" && item.nomenclatureId ? await kitForNomenclature(item.nomenclatureId) : [];
  const logistics = item.logisticsKopeks && item.logisticsKopeks > 0 ? formatRub(item.logisticsKopeks) : "по запросу";
  const leadTime = deliveryTerm(item.quantity);
  const specs = [
    item.brand
      ? {
          key: "brand",
          code: "brand",
          label: "Бренд",
          value: item.brand,
          href: item.brandRef?.slug ? catalogHref(new URLSearchParams([["brand", item.brandRef.slug]]), {}) : undefined,
        }
      : null,
    item.model ? { key: "model", code: "model", label: "Модель", value: item.model } : null,
    item.year ? { key: "year", code: "year", label: "Год", value: String(item.year) } : null,
    ...specsOf(item).map((spec) => ({
      key: spec.definition.code,
      code: spec.definition.code,
      label: spec.definition.name,
      value: specValue(spec),
    })),
  ].filter((row) => row !== null);
  return (
    <main className={`${pageFrame} flex flex-col gap-6 max-md:!pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-2`}>
      <CrumbTitle label={item.title} />
      <KitProvider
        groups={kit}
        baseKopeks={item.priceKopeks}
        logistics={logistics}
        listingId={item.id}
        slug={item.slug}
        maxQty={item.quantity}
        leadTime={leadTime}
        title={item.title}
        saved={saved}
        orderable={item.source === "company" && item.priceKopeks > 0}
        initialOptionIds={await cartOptionsForListing(item.id)}
      >
        <div className="contents md:col-start-2 md:row-start-1 md:flex md:flex-col md:gap-6">
          <div className="order-1 md:order-none">
            <h1 className="text-xl leading-6 sm:text-2xl">{item.title}</h1>
            <TrackView listingId={item.id} slug={item.slug} />
            <ErrorNote message={one("error")} />
            {item.priceKopeks <= 0 ? <p className="mt-4 text-sm">Напишите продавцу, чтобы узнать стоимость.</p> : null}
          </div>
          <div className="order-4 flex flex-col gap-6 md:order-none">
            {item.source === "individual" && item.lat != null && item.lng != null && process.env.YANDEX_MAPS_API_KEY ? (
              <div className="overflow-hidden rounded-2xl border border-line">
                <YandexPlaceMap
                  apiKey={process.env.YANDEX_MAPS_API_KEY}
                  lat={item.lat}
                  lng={item.lng}
                  zoom={13}
                  interactive={false}
                  focusKey={`${item.lat},${item.lng}`}
                />
              </div>
            ) : null}
            {item.description.trim() ? (
              <section>
                <h2 className={productSectionClass}>Описание</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.description}</p>
              </section>
            ) : null}
            {specs.length ? (
              <section>
                <h2 className={productSectionClass}>Характеристики</h2>
                <div className="mt-3">
                  <SpecGrid items={specs} />
                </div>
              </section>
            ) : null}
            <ProductGroups />
          </div>
        </div>
        <div className="contents md:col-start-1 md:row-start-1 md:flex md:flex-col md:gap-4">
          <div className="order-2 md:order-none">
            {highlights.length ? <HighlightSpecs items={highlights} /> : null}
            <ProductGallery title={item.title} images={item.images} attached={highlights.length > 0} />
          </div>
          <ProductCost />
        </div>
      </KitProvider>
    </main>
  );
}
