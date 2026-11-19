"use client";

import { useMemo, useState } from "react";
import { addToCartAction } from "@/actions/store";
import { TrashIcon } from "@/components/action-icons";
import { FavoriteButton, ShareButton } from "@/components/product-actions";
import { actionClass, mobileDockClass } from "@/components/styles";
import { formatRub } from "@/lib/format";
import type { KitGroup } from "@/lib/kit";

export function ProductKit({
  groups,
  baseKopeks,
  listingId,
  slug,
  maxQty,
  leadTime,
  imagePath,
  title,
  saved,
}: {
  groups: KitGroup[];
  baseKopeks: number;
  listingId: string;
  slug: string;
  maxQty: number;
  leadTime: string;
  imagePath: string;
  title: string;
  saved: boolean;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const selected = useMemo(() => {
    const rows: { id: string; group: KitGroup; name: string; priceKopeks: number }[] = [];
    for (const group of groups) {
      const ids = picked[group.id] ?? [];
      for (const item of group.items) {
        if (ids.includes(item.id)) rows.push({ ...item, group });
      }
    }
    return rows;
  }, [groups, picked]);
  const total = baseKopeks + selected.reduce((sum, item) => sum + item.priceKopeks, 0);

  function toggle(group: KitGroup, itemId: string) {
    setPicked((current) => {
      const ids = current[group.id] ?? [];
      if (group.kind === "fit") {
        return { ...current, [group.id]: ids[0] === itemId ? [] : [itemId] };
      }
      return {
        ...current,
        [group.id]: ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId],
      };
    });
  }

  return (
    <section className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-6">
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="text-base font-semibold text-deep">{group.name}</h3>
          <p className="mt-1 text-xs text-muted">{group.kind === "fit" ? "Исполнение, один вариант" : "Дополнительное оборудование"}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.items.map((item) => {
              const on = (picked[group.id] ?? []).includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(group, item.id)}
                  className={`overflow-hidden border bg-white text-left ${on ? "border-navy ring-2 ring-navy" : "border-line"}`}
                >
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${item.imagePath}`} alt="" className="block aspect-[4/3] w-full bg-foam object-contain" />
                  ) : (
                    <span className="flex aspect-[4/3] items-end bg-foam p-2 text-xs text-muted">{item.name}</span>
                  )}
                  <span className="block px-3 py-2">
                    <span className="block text-sm font-semibold leading-4 text-deep">{item.name}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {item.priceKopeks > 0 ? `+ ${formatRub(item.priceKopeks)}` : "без доплаты"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      </div>
      <aside className="grid gap-4 md:sticky md:top-32">
        {imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${imagePath}`} alt={title} className="aspect-[4/3] w-full bg-foam object-cover" />
        ) : (
          <span className="flex aspect-[4/3] items-end bg-foam p-3 text-sm font-semibold text-deep">{title}</span>
        )}
        <div className="bg-white p-4">
          <h2 className="text-base font-semibold">Расчёт стоимости</h2>
          <p className="mt-3 text-sm">Базовая цена: {formatRub(baseKopeks)}</p>
          {selected.map((item) => (
            <div key={item.id} className="mt-1 flex items-start justify-between gap-2 text-sm">
              <p>
                {item.name}: {item.priceKopeks > 0 ? `+ ${formatRub(item.priceKopeks)}` : "без доплаты"}
              </p>
              <button
                type="button"
                onClick={() => toggle(item.group, item.id)}
                className="shrink-0 text-muted hover:text-deep"
                aria-label={`Убрать ${item.name}`}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
          <p className="mt-3 text-2xl font-bold text-deep">{formatRub(total)}</p>
          <p className="mt-3 text-sm text-muted">Срок поставки (ориентировочно)</p>
          <p className="font-semibold text-deep">{leadTime}</p>
          <div className={mobileDockClass}>
            <FavoriteButton listingId={listingId} slug={slug} saved={saved} back={`/product/${slug}/configurator`} />
            <ShareButton title={title} />
            {baseKopeks > 0 ? (
              <form action={addToCartAction} className="grid min-w-0 flex-1 gap-3">
                <input type="hidden" name="listingId" value={listingId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="next" value={`/product/${slug}/configurator`} />
                {selected.map((item) => (
                  <input key={item.id} type="hidden" name="option" value={item.id} />
                ))}
                {maxQty > 1 ? (
                  <label className="text-sm">
                    Количество
                    <input name="qty" type="number" min={1} defaultValue={1} className="field mt-1 w-24 border border-line px-3 py-2" />
                  </label>
                ) : (
                  <input type="hidden" name="qty" value="1" />
                )}
                <button className={`${actionClass} w-full`}>{maxQty > 0 ? "Купить" : "Заказать"}</button>
              </form>
            ) : (
              <p className="text-sm text-muted">Сейчас эту лодку нельзя заказать.</p>
            )}
          </div>
        </div>
      </aside>
      <div className="h-14 md:hidden" aria-hidden="true" />
    </section>
  );
}
