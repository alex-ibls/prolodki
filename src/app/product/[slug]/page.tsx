import { notFound } from "next/navigation";
import Link from "next/link";
import { toggleFavoriteAction } from "@/actions/activity";
import { sendListingMessageAction } from "@/actions/messages";
import { addToCartAction } from "@/actions/store";
import { ErrorNote, specsOf } from "@/components/catalog-ui";
import { RevealPhone } from "@/components/reveal-phone";
import { TrackView } from "@/components/track-view";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { isFavorite, listingStats } from "@/lib/activity";
import { allCategories, getPublishedListing } from "@/lib/catalog";
import { categoryPath } from "@/lib/taxonomy";
import { formatRub } from "@/lib/format";
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
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="overflow-hidden rounded-3xl bg-[#e8f4fc]">
        {item.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${item.images[0].path}`} alt="" className="h-full max-h-[520px] w-full object-cover" />
        ) : (
          <div className="flex h-80 items-end bg-navy p-6 text-white">{item.category?.name}</div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted">
          <Link href={`/catalog?category=${item.category?.slug}`} className="hover:text-copper">
            {path}
          </Link>
          {" · "}
          {sourceLabel[item.source]} · {conditionLabel[item.condition]} · {item.city}
        </p>
        <h1 className="mt-2 text-3xl">{item.title}</h1>
        <p className="mt-2 text-sm text-muted">Просмотры: {stats?.view ?? 0}</p>
        <TrackView listingId={item.id} slug={item.slug} />
        {item.compareAtKopeks && item.compareAtKopeks > item.priceKopeks ? (
          <p className="mt-4 text-muted line-through">{formatRub(item.compareAtKopeks)}</p>
        ) : null}
        <p className="text-3xl font-semibold">{formatRub(item.priceKopeks)}</p>
        <p className="mt-2 text-sm">{available ? `В наличии: ${item.quantity}` : "Нет в наличии"}</p>
        <ErrorNote message={one("error")} />
        {available ? (
          <form action={addToCartAction} className="mt-4 flex items-end gap-3">
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
                  className="mt-1 w-24 rounded-xl border border-line px-3 py-2"
                />
              </label>
            ) : (
              <input type="hidden" name="qty" value="1" />
            )}
            <button className={buttonClass}>В корзину</button>
          </form>
        ) : null}
        <form action={toggleFavoriteAction} className="mt-3">
          <input type="hidden" name="listingId" value={item.id} />
          <input type="hidden" name="slug" value={item.slug} />
          <button className={secondaryClass}>{saved ? "В избранном" : "В избранное"}</button>
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
        <ul className="mt-4 space-y-1 text-sm">
          {item.brand ? <li>Бренд: {item.brand}</li> : null}
          {item.model ? <li>Модель: {item.model}</li> : null}
          {item.year ? <li>Год: {item.year}</li> : null}
          {specsOf(item).map((spec) => (
            <li key={spec.definition.name}>
              {spec.definition.name}: {spec.valueNumber}
              {spec.definition.unit ? ` ${spec.definition.unit}` : ""}
            </li>
          ))}
        </ul>
        {item.images.length > 1 ? (
          <div className="mt-4 flex gap-2">
            {item.images.slice(1).map((image) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={image.path} src={`/media/${image.path}`} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
