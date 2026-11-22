"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addToCartAction, saveConfigurationAction } from "@/actions/store";
import { TrashIcon } from "@/components/action-icons";
import { FavoriteButton, ShareButton } from "@/components/product-actions";
import { PhotoFrame } from "@/components/photo-frame";
import { actionClass } from "@/components/styles";
import { formatRub } from "@/lib/format";
import type { KitGroup } from "@/lib/kit";

export const productSectionClass = "font-display text-lg font-extrabold tracking-tight text-deep";

type Picked = { id: string; group: KitGroup; name: string; priceKopeks: number };

type KitState = {
  groups: KitGroup[];
  open: Record<string, boolean>;
  setOpen: (groupId: string, expanded: boolean) => void;
  picked: Record<string, string[]>;
  selected: Picked[];
  toggle: (group: KitGroup, itemId: string) => void;
  total: number;
  baseKopeks: number;
  logistics: string;
  listingId: string;
  slug: string;
  maxQty: number;
  leadTime: string;
  title: string;
  saved: boolean;
  orderable: boolean;
};

const KitContext = createContext<KitState | null>(null);

function useKit() {
  const value = useContext(KitContext);
  if (!value) throw new Error("Расчёт стоимости вне карточки товара");
  return value;
}

function pickedFromIds(groups: KitGroup[], ids: string[]) {
  const wanted = new Set(ids);
  const picked: Record<string, string[]> = {};
  for (const group of groups) {
    const chosen = group.items.map((item) => item.id).filter((id) => wanted.has(id));
    if (chosen.length === 0) continue;
    picked[group.id] = group.kind === "fit" ? [chosen[0]] : chosen;
  }
  return picked;
}

function optionIds(groups: KitGroup[], picked: Record<string, string[]>) {
  return groups.flatMap((group) => picked[group.id] ?? []);
}

export function KitProvider({
  groups,
  baseKopeks,
  logistics,
  listingId,
  slug,
  maxQty,
  leadTime,
  title,
  saved,
  orderable,
  initialOptionIds = [],
  children,
}: {
  groups: KitGroup[];
  baseKopeks: number;
  logistics: string;
  listingId: string;
  slug: string;
  maxQty: number;
  leadTime: string;
  title: string;
  saved: boolean;
  orderable: boolean;
  initialOptionIds?: string[];
  children: React.ReactNode;
}) {
  const restored = pickedFromIds(groups, initialOptionIds);
  const [open, setOpenState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(restored).map((id) => [id, true])),
  );
  const [picked, setPicked] = useState<Record<string, string[]>>(restored);
  const timer = useRef<number | null>(null);
  const chain = useRef(Promise.resolve());
  const pending = useRef<string[] | null>(null);

  function remember(next: Record<string, string[]>) {
    if (!orderable) return;
    const ids = optionIds(groups, next);
    pending.current = ids;
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const snapshot = pending.current;
      if (!snapshot) return;
      pending.current = null;
      chain.current = chain.current.then(() => saveConfigurationAction(listingId, snapshot)).then(() => undefined);
    }, 250);
  }

  useEffect(() => {
    return () => {
      if (timer.current == null) return;
      window.clearTimeout(timer.current);
      const snapshot = pending.current;
      pending.current = null;
      if (snapshot) void saveConfigurationAction(listingId, snapshot);
    };
  }, [listingId]);
  const selected = useMemo(() => {
    const rows: Picked[] = [];
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
      const next =
        group.kind === "fit"
          ? { ...current, [group.id]: ids[0] === itemId ? [] : [itemId] }
          : {
              ...current,
              [group.id]: ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId],
            };
      remember(next);
      return next;
    });
  }

  const value = {
    groups,
    open,
    setOpen: (groupId: string, expanded: boolean) => setOpenState((current) => ({ ...current, [groupId]: expanded })),
    picked,
    selected,
    toggle,
    total,
    baseKopeks,
    logistics,
    listingId,
    slug,
    maxQty,
    leadTime,
    title,
    saved,
    orderable,
  };

  return (
    <KitContext.Provider value={value}>
      <div className="contents">{children}</div>
    </KitContext.Provider>
  );
}

export function ProductCost() {
  const kit = useKit();
  const orderLabel = kit.maxQty > 0 ? "Купить" : "Заказать";
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white px-3 py-2 md:sticky md:inset-auto md:top-32 md:z-20 md:border md:p-3">
      <div className="hidden md:block">
        <h2 className="text-base font-semibold text-deep">Расчёт стоимости</h2>
        <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
          <div className="flex items-start justify-between gap-3 py-2">
            <dt>Базовая цена</dt>
            <dd className="shrink-0 font-medium text-deep">{formatRub(kit.baseKopeks)}</dd>
          </div>
          {kit.selected.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 py-2">
              <dt>{item.name}</dt>
              <dd className="flex shrink-0 items-center gap-2">
                <span className="text-muted">{item.priceKopeks > 0 ? `+ ${formatRub(item.priceKopeks)}` : "без доплаты"}</span>
                <button
                  type="button"
                  onClick={() => kit.toggle(item.group, item.id)}
                  className="text-muted hover:text-deep"
                  aria-label={`Убрать ${item.name}`}
                >
                  <TrashIcon />
                </button>
              </dd>
            </div>
          ))}
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-muted">Цена логистики до дилерского центра в Москве</dt>
            <dd className="shrink-0 font-semibold text-deep">{kit.logistics}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-muted">Срок поставки (ориентировочно)</dt>
            <dd className="shrink-0 font-semibold text-deep">{kit.leadTime}</dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center gap-2 md:mt-3 md:block">
        <p className="min-w-0 text-lg font-bold text-deep md:text-2xl">{formatRub(kit.total)}</p>
        {kit.orderable ? (
          <form id="product-order" action={addToCartAction} className="hidden md:block">
            <input type="hidden" name="listingId" value={kit.listingId} />
            <input type="hidden" name="slug" value={kit.slug} />
            <input type="hidden" name="next" value={`/product/${kit.slug}`} />
            {kit.selected.map((item) => (
              <input key={item.id} type="hidden" name="option" value={item.id} />
            ))}
            {kit.maxQty > 1 ? (
              <label className="mt-3 block text-sm">
                Количество
                <input name="qty" type="number" min={1} defaultValue={1} className="field mt-1 w-24 border border-line px-3 py-2" />
              </label>
            ) : (
              <input type="hidden" name="qty" value="1" />
            )}
          </form>
        ) : null}
        <div className="ml-auto flex min-w-0 flex-1 items-center gap-2 md:ml-0 md:mt-3">
          <FavoriteButton listingId={kit.listingId} slug={kit.slug} saved={kit.saved} />
          <ShareButton title={kit.title} />
          {kit.orderable ? (
            <button form="product-order" className={`${actionClass} min-w-0 flex-1`}>
              {orderLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProductGroups() {
  const kit = useKit();
  if (kit.groups.length === 0) return null;
  return (
    <section>
      <h2 className={productSectionClass}>Комплектация</h2>
      <div className="mt-3 grid gap-2">
        {kit.groups.map((group) => {
          const expanded = kit.open[group.id] === true;
          const chosen = kit.picked[group.id]?.length ?? 0;
          return (
            <div key={group.id} className="border border-line bg-white">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => kit.setOpen(group.id, !expanded)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-deep">{group.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {group.kind === "fit" ? "Исполнение, один вариант" : "Дополнительное оборудование"}
                    {chosen > 0 ? ` · выбрано ${chosen}` : ` · ${group.items.length}`}
                  </span>
                </span>
                <span aria-hidden="true" className="text-deep">
                  {expanded ? "–" : "+"}
                </span>
              </button>
              <div className={expanded ? "border-t border-line p-2" : "hidden"}>
                <div className="grid grid-cols-3 gap-1.5">
                  {group.items.map((item) => {
                    const on = (kit.picked[group.id] ?? []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => kit.toggle(group, item.id)}
                        className={`overflow-hidden border bg-white text-left ${on ? "border-navy ring-1 ring-navy" : "border-line"}`}
                      >
                        <PhotoFrame path={item.imagePath} className="block aspect-[4/3] w-full object-contain" />
                        <span className="block px-1.5 py-1">
                          <span className="block text-xs font-semibold leading-4 text-deep">{item.name}</span>
                          <span className="mt-0.5 block text-[11px] text-muted">
                            {item.priceKopeks > 0 ? `+ ${formatRub(item.priceKopeks)}` : "без доплаты"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
