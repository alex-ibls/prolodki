import { notFound } from "next/navigation";
import Link from "next/link";
import { addToCartAction } from "@/actions/store";
import { CrumbTitle } from "@/components/breadcrumbs";
import { FavoriteButton, ShareButton } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";
import { YandexPlaceMap } from "@/components/yandex-place-map";
import { ErrorNote, HighlightSpecs, companyPhone, highlightSpecs, SpecGrid, specsOf, specValue, telHref } from "@/components/catalog-ui";
import { RevealPhone } from "@/components/reveal-phone";
import { TrackView } from "@/components/track-view";
import { actionClass, mobileDockClass, pageFrame } from "@/components/styles";
import { isFavorite } from "@/lib/activity";
import { getPublishedListing } from "@/lib/catalog";
import { deliveryTerm, formatOffer, formatRub } from "@/lib/format";
import { readQuery } from "@/lib/query";
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
  const available = item.quantity > 0;
  const saved = await isFavorite(item.id);
  const companyLine = companyPhone({ source: item.source, phone: item.organization?.phone });
  const hasPhone = Boolean(item.seller?.phone?.trim() || item.organization?.phone?.trim());
  const highlights = highlightSpecs(item);
  const kit = item.source === "company" && item.nomenclatureId ? await kitForNomenclature(item.nomenclatureId) : [];
  const logistics = item.logisticsKopeks && item.logisticsKopeks > 0 ? formatRub(item.logisticsKopeks) : "по запросу";
  const leadTime = deliveryTerm(item.quantity);
  return (
    <main className={`${pageFrame} grid max-w-6xl gap-6 md:grid-cols-2`}>
      <CrumbTitle label={item.title} />
      <div className="order-1 md:col-start-2 md:row-start-1">
        <h1 className="text-xl leading-6 sm:text-2xl">{item.title}</h1>
      </div>
      <div className="order-2 md:col-start-1 md:row-start-1 md:row-span-2">
        {highlights.length ? <HighlightSpecs items={highlights} /> : null}
        <ProductGallery title={item.title} images={item.images} attached={highlights.length > 0}>
          <div className="mt-3">
            <p className="font-display text-3xl font-bold leading-tight text-deep">{formatOffer(item.priceKopeks)}</p>
            {item.compareAtKopeks && item.priceKopeks > 0 && item.compareAtKopeks > item.priceKopeks ? (
              <p className="text-sm text-muted line-through">{formatRub(item.compareAtKopeks)}</p>
            ) : null}
            <p className="mt-3 text-sm text-muted">Цена логистики до дилерского центра в Москве</p>
            <p className="font-semibold text-deep">{logistics}</p>
            <p className="mt-2 text-sm text-muted">Срок поставки (ориентировочно)</p>
            <p className="font-semibold text-deep">{leadTime}</p>
          </div>
        </ProductGallery>
      </div>
      <div className="order-3 md:col-start-2 md:row-start-2">
        {item.source === "individual" && item.lat != null && item.lng != null && process.env.YANDEX_MAPS_API_KEY ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
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
        {item.source === "company" ? (
          <p className="mt-2 text-sm">{available ? `В наличии: ${item.quantity}` : "Нет в наличии"}</p>
        ) : null}
        <TrackView listingId={item.id} slug={item.slug} />
        <ErrorNote message={one("error")} />
        {item.priceKopeks <= 0 ? <p className="mt-4 text-sm">Напишите продавцу, чтобы узнать стоимость.</p> : null}
        <div className={`${mobileDockClass} md:flex-wrap md:items-center`}>
          <FavoriteButton listingId={item.id} slug={item.slug} saved={saved} />
          <ShareButton title={item.title} />
          {kit.length ? (
            <Link href={`/product/${item.slug}/configurator`} className={`${actionClass} min-w-0 flex-1 md:flex-none`}>
              {available ? "Купить" : "Заказать"}
            </Link>
          ) : item.source === "company" && item.priceKopeks > 0 ? (
            <form action={addToCartAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:flex-none">
              <input type="hidden" name="listingId" value={item.id} />
              <input type="hidden" name="slug" value={item.slug} />
              {item.quantity > 1 ? (
                <label className="text-sm">
                  Количество
                  <input
                    name="qty"
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="field mt-1 w-24 border border-line px-3 py-2"
                  />
                </label>
              ) : (
                <input type="hidden" name="qty" value="1" />
              )}
              <button className={`${actionClass} min-w-0 flex-1 md:flex-none`}>{available ? "Купить" : "Заказать"}</button>
            </form>
          ) : null}
        </div>
        {companyLine ? (
          <p className="mt-4">
            <a href={telHref(companyLine)} className="text-lg font-semibold">
              {companyLine}
            </a>
          </p>
        ) : hasPhone ? (
          <RevealPhone listingId={item.id} />
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{item.description}</p>
        <div className="mt-4">
          <SpecGrid
            items={[
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
            ].filter((row) => row !== null)}
          />
        </div>
      </div>
      <div className="order-4 h-14 md:hidden" aria-hidden="true" />
    </main>
  );
}
