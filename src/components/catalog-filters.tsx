"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SortMenu } from "@/components/quick-filters";
import { actionClass, secondaryClass } from "@/components/styles";
import type { CatalogChoice, CatalogFacets, NumberFacet } from "@/lib/catalog-facets";
import { catalogHref } from "@/lib/sef";

export function CatalogFilters({
  search,
  paths,
  categories,
  typeSlug,
  facets,
  total: initialTotal,
}: {
  search: string;
  paths: Record<string, string>;
  categories: CatalogChoice[];
  typeSlug: string;
  facets: CatalogFacets;
  total: number;
}) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const params = new URLSearchParams(search);
  const urlCategory = params.get("category") || "";
  const selected = [...params.keys()].filter((key) => key !== "q" && key !== "price" && key !== "page").length;
  const [category, setCategory] = useState(typeSlug);
  const typeTouched = useRef(false);
  const [active, setActive] = useState(facets);
  const [pending, setPending] = useState(false);
  const [price, setPrice] = useState(() => readRange(params.get("price_min"), params.get("price_max"), facets.price));
  const [ranges, setRanges] = useState(() => numberRanges(facets, params));
  const [selects, setSelects] = useState(0);
  const [total, setTotal] = useState(initialTotal);
  const requestId = useRef(0);
  const countId = useRef(0);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const media = window.matchMedia("(min-width: 768px)");
    const lock = () => {
      document.body.style.overflow = media.matches ? "" : "hidden";
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onWide = () => {
      if (media.matches) setOpen(false);
    };
    lock();
    media.addEventListener("change", lock);
    media.addEventListener("change", onWide);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      media.removeEventListener("change", lock);
      media.removeEventListener("change", onWide);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function adopt(next: CatalogFacets, keepUrl: boolean) {
    setPending(false);
    setActive(next);
    setPrice(readRange(keepUrl ? params.get("price_min") : null, keepUrl ? params.get("price_max") : null, next.price));
    setRanges(numberRanges(next, keepUrl ? params : new URLSearchParams()));
  }

  async function chooseCategory(value: string) {
    typeTouched.current = true;
    setCategory(value);
    setPending(true);
    setActive({ listings: 0, price: null, brands: [], conditions: [], sources: [], attributes: [] });
    setPrice(null);
    setRanges({});
    const id = ++requestId.current;
    const response = await fetch(`/api/catalog/facets${value ? `?category=${encodeURIComponent(value)}` : ""}`);
    if (id !== requestId.current) return;
    if (!response.ok) {
      setPending(false);
      return;
    }
    adopt((await response.json()) as CatalogFacets, value === urlCategory);
  }

  function draftParams(formData: FormData) {
    const next = new URLSearchParams(search);
    next.delete("page");
    next.delete("date");
    next.delete("registered");
    next.delete("source");
    for (const key of [...next.keys()]) {
      if (key.startsWith("attr_") || key === "price_min" || key === "price_max" || key === "brand") next.delete(key);
    }
    const picked = String(formData.get("category") || "");
    put(next, "category", !typeTouched.current && picked === typeSlug ? urlCategory : picked);
    for (const value of formData.getAll("brand")) {
      if (value) next.append("brand", String(value));
    }
    put(next, "condition", String(formData.get("condition") || ""));
    if (active.price && price) writeRange(next, "price_min", "price_max", price, active.price);
    for (const item of active.attributes) {
      if (item.kind === "number") {
        const range = ranges[item.code];
        if (range) writeRange(next, `attr_${item.code}_min`, `attr_${item.code}_max`, range, item);
      } else {
        put(next, `attr_${item.code}`, String(formData.get(`attr_${item.code}`) || ""));
      }
    }
    return next;
  }

  useEffect(() => {
    if (pending) return;
    const form = document.getElementById("catalog-filters");
    if (!(form instanceof HTMLFormElement)) return;
    const query = draftParams(new FormData(form)).toString();
    const id = ++countId.current;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/catalog/count?${query}`);
      if (!response.ok || id !== countId.current) return;
      const data = (await response.json()) as { total?: number };
      if (typeof data.total === "number") setTotal(data.total);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [category, price, ranges, selects, pending, active]);

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    router.push(catalogHref(draftParams(new FormData(event.currentTarget)), paths));
  }

  const reset = new URLSearchParams(search);
  reset.delete("page");
  for (const key of [...reset.keys()]) {
    if (key !== "q" && key !== "price") reset.delete(key);
  }

  return (
    <>
    <div className="flex justify-end gap-2 md:hidden">
      <SortMenu search={search} paths={paths} suspended={open} />
      <button
        type="button"
        className={`${iconButton} relative`}
        aria-label="Фильтры"
        aria-expanded={open}
        aria-controls="catalog-filters"
        onClick={() => setOpen(true)}
      >
        <SettingsIcon />
        {selected > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-semibold text-white">
            {selected}
          </span>
        ) : null}
      </button>
    </div>
    {open ? (
      <button type="button" className="fixed inset-0 z-50 bg-deep/40 md:hidden" aria-label="Закрыть фильтры" onClick={() => setOpen(false)} />
    ) : null}
    <form
      id="catalog-filters"
      onSubmit={apply}
      onChange={() => setSelects((value) => value + 1)}
      role={open ? "dialog" : undefined}
      aria-modal={open ? true : undefined}
      aria-labelledby={open ? "catalog-filters-title" : undefined}
      className={
        open
          ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[min(85dvh,100%)] min-w-0 flex-col rounded-t bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(50,55,70,0.12)] motion-safe:animate-[sheet-up_200ms_ease-out] md:static md:z-auto md:min-h-0 md:w-full md:max-h-none md:flex-1 md:animate-none md:gap-0 md:overflow-hidden md:rounded-none md:pb-0 md:shadow-none"
          : "hidden min-w-0 bg-white md:flex md:min-h-0 md:w-full md:flex-1 md:flex-col md:overflow-hidden"
      }
    >
      <div className="md:hidden">
        <div className="mx-auto mt-2 h-1 w-10 bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between px-4 py-3">
          <h2 id="catalog-filters-title" className="text-base font-semibold text-deep">
            Фильтры
          </h2>
          <button ref={closeRef} type="button" className="px-2 py-1 text-sm text-muted" onClick={() => setOpen(false)}>
            Закрыть
          </button>
        </div>
      </div>
      <h2 className="hidden px-4 pt-4 text-base font-semibold text-deep md:block">Фильтры</h2>
      <div className="grid min-h-0 min-w-0 flex-1 gap-4 overflow-y-auto px-4 pb-4 md:px-4">
      <SelectField
        label="Раздел"
        name="category"
        value={category}
        options={categories}
        empty="Любой"
        onChange={(value) => void chooseCategory(value)}
      />
      <div key={category || "all"} className="contents">
      {active.brands.length > 0 ? (
        <BrandField options={active.brands} selected={category === urlCategory ? params.getAll("brand") : []} />
      ) : null}
      {active.conditions.length > 1 ? (
        <SelectField label="Состояние" name="condition" value={category === urlCategory ? params.get("condition") || "" : ""} options={active.conditions} empty="Любое" />
      ) : null}
      {active.price && price ? (
        <RangeField
          label="Цена"
          unit="₽"
          min={active.price.min}
          max={active.price.max}
          step={active.price.step}
          value={price}
          format={formatMoney}
          onChange={setPrice}
        />
      ) : null}
      {category && !pending && active.listings === 0 ? (
        <p className="text-sm text-muted">В этом разделе пока нет товаров.</p>
      ) : null}
      {category && !pending && active.listings > 0 && active.attributes.length === 0 && !active.price && active.brands.length < 2 && active.conditions.length < 2 && active.sources.length < 2 ? (
        <p className="text-sm text-muted">В карточках этого раздела параметры одинаковые.</p>
      ) : null}
      {active.attributes.map((item) =>
        item.kind === "number" ? (
          <RangeField
            key={item.code}
            label={item.name}
            unit={item.unit}
            min={item.min}
            max={item.max}
            step={item.step}
            value={ranges[item.code] ?? { from: item.min, to: item.max }}
            format={formatNumber}
            onChange={(value) => setRanges((current) => ({ ...current, [item.code]: value }))}
          />
        ) : (
          <SelectField
            key={item.code}
            label={item.name}
            name={`attr_${item.code}`}
            value={category === urlCategory ? params.get(`attr_${item.code}`) || "" : ""}
            options={item.options.map((option) => ({ value: option, label: choiceLabel(option, item.unit) }))}
            empty="Любой"
          />
        ),
      )}
      </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line p-4 md:hidden">
      <button className={`${actionClass} w-full whitespace-nowrap`}>Показать {formatMoney(total)}</button>
      <Link href={catalogHref(reset, paths)} className={`${secondaryClass} w-full`}>
        Сбросить
      </Link>
      </div>
      <div className="hidden px-4 pb-4 md:block">
        <Link href={catalogHref(reset, paths)} className={`${secondaryClass} w-full`}>
          Сбросить
        </Link>
      </div>
      {selects > 0 ? (
        <div className="hidden shrink-0 border-t border-line bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(50,55,70,0.12)] motion-safe:animate-[sheet-up_200ms_ease-out] md:block">
          <button className={`${actionClass} w-full whitespace-nowrap`}>Показать {formatMoney(total)}</button>
        </div>
      ) : null}
    </form>
    </>
  );
}

function BrandField({ options, selected }: { options: CatalogChoice[]; selected: string[] }) {
  const picked = new Set(selected);
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="text-sm text-ink">Бренд</legend>
      <div className="grid max-h-44 gap-1.5 overflow-y-auto pr-1">
        {options.map((option) => (
          <label key={option.value} className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="brand" value={option.value} defaultChecked={picked.has(option.value)} className="accent-moss" />
            <span className="min-w-0 truncate">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  empty,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: CatalogChoice[];
  empty: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm text-ink">
      {label}
      <select
        name={name}
        defaultValue={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="field w-full min-w-0 max-w-full border border-line bg-white px-3 py-2 accent-moss focus:border-moss"
      >
        <option value="">{empty}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeField({
  label,
  unit,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: { from: number; to: number };
  format: (value: number) => string;
  onChange: (value: { from: number; to: number }) => void;
}) {
  const span = Math.max(max - min, step);
  const left = ((value.from - min) / span) * 100;
  const right = ((value.to - min) / span) * 100;
  const caption = unit ? `${format(value.from)} – ${format(value.to)} ${unit}` : `${format(value.from)} – ${format(value.to)}`;
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="text-sm text-ink">{label}</legend>
      <p className="text-xs text-muted">{caption}</p>
      <div className="relative mx-2 h-6 min-w-0">
        <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 bg-line" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 bg-moss" style={{ left: `${left}%`, width: `${Math.max(right - left, 0)}%` }} />
        <RangeInput
          label={`${label}, от`}
          min={min}
          max={max}
          step={step}
          value={value.from}
          onChange={(from) => onChange({ from: Math.min(from, value.to), to: value.to })}
        />
        <RangeInput
          label={`${label}, до`}
          min={min}
          max={max}
          step={step}
          value={value.to}
          onChange={(to) => onChange({ from: value.from, to: Math.max(to, value.from) })}
        />
      </div>
    </fieldset>
  );
}

function RangeInput({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(snap(Number(event.target.value), min, step))}
      className="pointer-events-none absolute inset-0 m-0 w-full min-w-0 max-w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-moss [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-moss"
    />
  );
}

function numberRanges(facets: CatalogFacets, params: URLSearchParams) {
  return Object.fromEntries(
    facets.attributes
      .filter((item): item is NumberFacet => item.kind === "number")
      .map((item) => [item.code, readRange(params.get(`attr_${item.code}_min`), params.get(`attr_${item.code}_max`), item)]),
  );
}

function readRange(fromRaw: string | null, toRaw: string | null, bounds: { min: number; max: number } | null) {
  if (!bounds) return null;
  const from = clamp(fromRaw, bounds.min, bounds);
  const to = clamp(toRaw, bounds.max, bounds);
  return { from: Math.min(from, to), to: Math.max(from, to) };
}

function clamp(raw: string | null, fallback: number, bounds: { min: number; max: number }) {
  const value = raw ? Number(raw.replace(",", ".")) : fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

function writeRange(
  params: URLSearchParams,
  fromKey: string,
  toKey: string,
  value: { from: number; to: number },
  bounds: { min: number; max: number; step: number },
) {
  if (value.from > bounds.min) params.set(fromKey, String(snap(value.from, bounds.min, bounds.step)));
  if (value.to < bounds.max) params.set(toKey, String(snap(value.to, bounds.min, bounds.step)));
}

function put(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}

function snap(value: number, min: number, step: number) {
  const steps = Math.round((value - min) / step);
  return Number((min + steps * step).toFixed(4));
}

function choiceLabel(option: string, unit: string) {
  const numeric = Number(option.replace(",", "."));
  if (!unit || !Number.isFinite(numeric)) return option;
  const text = formatNumber(numeric);
  return unit === "°" ? `${text}${unit}` : `${text} ${unit}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

const iconButton = "btn inline-flex h-10 w-10 items-center justify-center border border-line bg-white text-ink hover:border-navy";

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </svg>
  );
}
