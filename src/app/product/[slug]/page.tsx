import { notFound } from "next/navigation";
import Link from "next/link";
import { toggleFavoriteAction } from "@/actions/activity";
import { sendListingMessageAction } from "@/actions/messages";
import { addToCartAction } from "@/actions/store";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product-gallery";
import { YandexPlaceMap } from "@/components/yandex-place-map";
import { ErrorNote, companyPhone, registeredSpec, SpecGrid, specsOf, specValue, telHref } from "@/components/catalog-ui";
import { RevealPhone } from "@/components/reveal-phone";
import { TrackView } from "@/components/track-view";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { isFavorite, listingStats } from "@/lib/activity";
import { allCategories, getPublishedListing } from "@/lib/catalog";
import { categoryPath } from "@/lib/taxonomy";
import { formatOffer, formatRub } from "@/lib/format";
import { conditionLabel, sourceLabel } from "@/lib/labels";
import { buyerThreadForListing, isListingSeller } from "@/lib/messages";
import { readQuery } from "@/lib/query";
import { catalogHref, categoryPathMap } from "@/lib/sef";
import { getCurrentUser } from "@/lib/session";

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
  const user = await getCurrentUser();
  const available = item.quantity > 0;
  const stats = (await listingStats([item.id])).get(item.id);
  const saved = await isFavorite(item.id);
  const companyLine = companyPhone({ source: item.source, phone: item.organization?.phone });
  const hasPhone = Boolean(item.seller?.phone?.trim() || item.organization?.phone?.trim());
  const sellerHere = isListingSeller(user ?? null, item);
  const thread = sellerHere ? null : await buyerThreadForListing(item.id);
  const categories = await allCategories();
  const path = categoryPath(categories, item.categoryId);
  const categoryHref = item.category?.slug ? catalogHref(new URLSearchParams({ category: item.category.slug }), categoryPathMap(categories)) : "/";
  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-3 py-3 sm:px-4 sm:py-8 lg:grid-cols-2 lg:gap-6">
      <CrumbTitle label={item.title} />
      <ProductGallery title={item.title} images={item.images} />
      <div>
        <p className="font-display text-[1.75rem] font-extrabold leading-tight text-deep">{formatOffer(item.priceKopeks)}</p>
        {item.compareAtKopeks && item.priceKopeks > 0 && item.compareAtKopeks > item.priceKopeks ? (
          <p className="text-sm text-[#757575] line-through">{formatRub(item.compareAtKopeks)}</p>
        ) : null}
        <h1 className="mt-1 text-xl leading-6 sm:text-2xl">{item.title}</h1>
        <p className="mt-2 text-sm text-muted">
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
        {item.source === "company" && available && item.priceKopeks > 0 ? (
          <form action={addToCartAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="listingId" value={item.id} />
            <input type="hidden" name="slug" value={item.slug} />
            {item.quantity > 1 ? (
              <label className="text-sm">
                Количество
                <input
                  name="qty"
                  type="number"
                  min={1}
                  max={item.quantity}
                  defaultValue={1}
                  className="field mt-1 w-24 border border-line px-3 py-2"
                />
              </label>
            ) : (
              <input type="hidden" name="qty" value="1" />
            )}
            <button className={`${buttonClass} w-full sm:w-auto`}>В корзину</button>
          </form>
        ) : null}
        <form action={toggleFavoriteAction} className="mt-3">
          <input type="hidden" name="listingId" value={item.id} />
          <input type="hidden" name="slug" value={item.slug} />
          <button className={`${secondaryClass} w-full sm:w-auto`}>{saved ? "В избранном" : "В избранное"}</button>
        </form>
        {companyLine ? (
          <p className="mt-4">
            <a href={telHref(companyLine)} className="text-lg font-semibold">
              {companyLine}
            </a>
          </p>
        ) : hasPhone ? (
          <RevealPhone listingId={item.id} />
        ) : null}
        {sellerHere ? (
          <p className="mt-4 text-sm">
            <Link href="/account/messages" className="font-semibold">
              Сообщения покупателей
            </Link>
          </p>
        ) : (
          <form action={sendListingMessageAction} className="mt-4 grid gap-3 rounded-3xl border border-line bg-card p-4">
            <p className="text-sm font-semibold">Написать продавцу</p>
            <input type="hidden" name="listingId" value={item.id} />
            <input type="hidden" name="slug" value={item.slug} />
            {user ? null : (
              <label className="text-sm">
                Имя
                <input name="contactName" required className={inputClass} />
              </label>
            )}
            <label className="text-sm">
              Сообщение
              <textarea name="body" required rows={4} className={inputClass} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button className={buttonClass}>Отправить</button>
              {thread ? (
                <Link href={user ? `/account/messages/${thread.id}` : `/messages/${thread.id}`} className="text-sm font-semibold">
                  Открыть переписку
                </Link>
              ) : null}
            </div>
          </form>
        )}
        <p className="mt-6 whitespace-pre-wrap text-sm leading-6">{item.description}</p>
        <div className="mt-6">
          <SpecGrid
            items={[
              item.brand ? { key: "brand", code: "brand", label: "Бренд", value: item.brand } : null,
              item.model ? { key: "model", code: "model", label: "Модель", value: item.model } : null,
              item.year ? { key: "year", code: "year", label: "Год", value: String(item.year) } : null,
              registeredSpec(item.registered),
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
