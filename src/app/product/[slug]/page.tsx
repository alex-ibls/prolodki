import { notFound } from "next/navigation";
import Link from "next/link";
import { addToCartAction } from "@/actions/store";
import { CartIcon } from "@/components/action-icons";
import { CrumbTitle } from "@/components/breadcrumbs";
import { FavoriteButton, ShareButton } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";
import { YandexPlaceMap } from "@/components/yandex-place-map";
import { ErrorNote, HighlightSpecs, companyPhone, highlightSpecs, SpecGrid, specsOf, specValue, telHref } from "@/components/catalog-ui";
import { RevealPhone } from "@/components/reveal-phone";
import { TrackView } from "@/components/track-view";
import { actionClass } from "@/components/styles";
import { isFavorite, listingStats } from "@/lib/activity";
import { allCategories, getPublishedListing } from "@/lib/catalog";
import { categoryPath } from "@/lib/taxonomy";
import { deliveryTerm, formatOffer, formatRub } from "@/lib/format";
import { conditionLabel, sourceLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";
import { kitForNomenclature } from "@/lib/kit";
import { catalogHref, categoryPathMap } from "@/lib/sef";

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
  const stats = (await listingStats([item.id])).get(item.id);
  const saved = await isFavorite(item.id);
  const companyLine = companyPhone({ source: item.source, phone: item.organization?.phone });
  const hasPhone = Boolean(item.seller?.phone?.trim() || item.organization?.phone?.trim());
  const categories = await allCategories();
  const path = categoryPath(categories, item.categoryId);
  const categoryHref = item.category?.slug ? catalogHref(new URLSearchParams({ category: item.category.slug }), categoryPathMap(categories)) : "/";
  const highlights = highlightSpecs(item);
  const kit = item.source === "company" && item.nomenclatureId ? await kitForNomenclature(item.nomenclatureId) : [];
  const logistics = item.logisticsKopeks && item.logisticsKopeks > 0 ? formatRub(item.logisticsKopeks) : "по запросу";
  const leadTime = deliveryTerm(item.quantity, item.leadTime);
  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-3 py-3 sm:px-4 sm:py-8 lg:grid-cols-2 lg:gap-6">
      <CrumbTitle label={item.title} />
      <div className="order-1 lg:col-start-2 lg:row-start-1">
        <h1 className="text-xl leading-6 sm:text-2xl">{item.title}</h1>
      </div>
      <div className="order-2 lg:col-start-1 lg:row-start-1 lg:row-span-2">
        {highlights.length ? <HighlightSpecs items={highlights} /> : null}
        <ProductGallery title={item.title} images={item.images} attached={highlights.length > 0}>
          <div className="mt-3">
            <p className="font-display text-3xl font-bold leading-tight text-deep">{formatOffer(item.priceKopeks)}</p>
            {item.compareAtKopeks && item.priceKopeks > 0 && item.compareAtKopeks > item.priceKopeks ? (
              <p className="text-sm text-muted line-through">{formatRub(item.compareAtKopeks)}</p>
            ) : null}
            <p className="text-xs font-semibold text-navy">Цена товара</p>
            <p className="mt-3 text-sm text-muted">Цена логистики до дилерского центра в Москве</p>
            <p className="font-semibold text-deep">{logistics}</p>
            <p className="mt-2 text-sm text-muted">Срок поставки (ориентировочно)</p>
            <p className="font-semibold text-deep">{leadTime}</p>
          </div>
        </ProductGallery>
      </div>
      <div className="order-3 lg:col-start-2 lg:row-start-2">
        <p className="text-sm text-muted">
          <Link href={categoryHref} className="hover:text-copper">
            {path}
          </Link>
          {" · "}
          {[
            sourceLabel[item.source],
            conditionLabel[item.condition],
            item.source === "company" ? (item.onOrder ? "На заказ" : "В наличии") : "",
            item.source === "individual" ? item.city : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 text-sm text-muted">Просмотры: {stats?.view ?? 0}</p>
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FavoriteButton listingId={item.id} slug={item.slug} saved={saved} />
          <ShareButton title={item.title} />
          {kit.length ? (
            <Link href={`/product/${item.slug}/configurator`} className={actionClass}>
              <CartIcon />
              Заказать
            </Link>
          ) : item.source === "company" && item.priceKopeks > 0 ? (
            <form action={addToCartAction} className="flex flex-wrap items-end gap-2">
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
              <button className={actionClass}>
                <CartIcon />
                Заказать
              </button>
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
        <p className="mt-6 whitespace-pre-wrap text-sm leading-6">{item.description}</p>
        <div className="mt-6">
          <SpecGrid
            items={[
              item.brand ? { key: "brand", code: "brand", label: "Бренд", value: item.brand } : null,
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
    </main>
  );
}
