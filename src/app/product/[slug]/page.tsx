import { notFound } from "next/navigation";
import Link from "next/link";
import { toggleFavoriteAction } from "@/actions/activity";
import { sendListingMessageAction } from "@/actions/messages";
import { addToCartAction } from "@/actions/store";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product-gallery";
import { ErrorNote, registeredSpec, SpecGrid, specsOf, specValue } from "@/components/catalog-ui";
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
  const hasPhone = Boolean(item.seller?.phone?.trim() || item.organization?.phone?.trim());
  const sellerHere = isListingSeller(user ?? null, item);
  const thread = sellerHere ? null : await buyerThreadForListing(item.id);
  const path = categoryPath(await allCategories(), item.categoryId);
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-4 sm:py-8 lg:grid-cols-2">
      <CrumbTitle label={item.title} />
      <ProductGallery title={item.title} images={item.images} />
      <div>
        <p className="text-sm text-muted">
          <Link href={item.category?.slug ? `/?category=${item.category.slug}` : "/"} className="hover:text-copper">
            {path}
          </Link>
          {" · "}
          {[sourceLabel[item.source], conditionLabel[item.condition], item.onOrder ? "На заказ" : "В наличии", item.city].filter(Boolean).join(" · ")}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl">{item.title}</h1>
        <p className="mt-2 text-sm text-muted">Просмотры: {stats?.view ?? 0}</p>
        <TrackView listingId={item.id} slug={item.slug} />
        {item.compareAtKopeks && item.priceKopeks > 0 && item.compareAtKopeks > item.priceKopeks ? (
          <p className="mt-4 text-muted line-through">{formatRub(item.compareAtKopeks)}</p>
        ) : null}
        <p className="text-2xl font-semibold sm:text-3xl">{formatOffer(item.priceKopeks)}</p>
        <p className="mt-2 text-sm">{available ? `В наличии: ${item.quantity}` : "Нет в наличии"}</p>
        <ErrorNote message={one("error")} />
        {item.priceKopeks <= 0 ? <p className="mt-4 text-sm">Напишите продавцу, чтобы узнать стоимость.</p> : null}
        {available && item.priceKopeks > 0 ? (
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
        {hasPhone ? <RevealPhone listingId={item.id} /> : null}
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
