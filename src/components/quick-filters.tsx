"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Vessel = { slug: string; name: string };

const kinds = [
  { id: "price", label: "Цена" },
  { id: "date", label: "Дата" },
  { id: "vessel", label: "Тип судна" },
  { id: "registered", label: "Регистрация" },
] as const;

type Kind = (typeof kinds)[number]["id"];

const selectClass =
  "w-full appearance-none bg-transparent py-2 pl-3 pr-8 text-sm text-ink outline-none disabled:text-muted";

export function QuickFilters({
  search,
  vessels,
  categoryName,
}: {
  search: string;
  vessels: Vessel[];
  categoryName: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | "">("");
  const params = new URLSearchParams(search);

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(search);
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const text = next.toString();
    router.push(text ? `/?${text}` : "/");
    setKind("");
  }

  function apply(value: string) {
    if (!kind || !value) return;
    if (kind === "price") go({ sort: value });
    else if (kind === "date") go({ sort: value === "new" ? null : value });
    else if (kind === "vessel") go({ category: value });
    else go({ registered: value });
  }

  const options =
    kind === "price"
      ? [
          { value: "price_asc", label: "Дешевле" },
          { value: "price_desc", label: "Дороже" },
        ]
      : kind === "date"
        ? [
            { value: "new", label: "Новые" },
            { value: "old", label: "Старые" },
          ]
        : kind === "vessel"
          ? vessels.map((item) => ({ value: item.slug, label: item.name }))
          : kind === "registered"
            ? [
                { value: "yes", label: "Регистрат" },
                { value: "no", label: "Нерегистрат" },
              ]
            : [];

  const tags = filterTags(params, vessels, categoryName);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="field flex w-full items-center border border-line bg-white sm:w-auto">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Тип фильтра</span>
          <select
            value={kind}
            className={selectClass}
            onChange={(event) => setKind(event.target.value as Kind | "")}
          >
            <option value="">Тип</option>
            {kinds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <Caret />
        </label>
        <span className="h-5 w-px shrink-0 bg-line" />
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Значение фильтра</span>
          <select
            key={kind}
            defaultValue=""
            disabled={!kind}
            className={selectClass}
            onChange={(event) => apply(event.target.value)}
          >
            <option value="">Значение</option>
            {options.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Caret />
        </label>
      </div>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className="tag inline-flex items-center gap-1.5 border border-line bg-white px-3 py-2 text-sm"
          onClick={() => go(tag.clear)}
        >
          <span className="text-muted">{tag.type}</span>
          <span className="font-semibold">{tag.label}</span>
          <span aria-hidden>×</span>
          <span className="sr-only">Убрать фильтр</span>
        </button>
      ))}
    </div>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-3 size-1.5 -translate-y-1/2 rotate-45 border-r border-b border-muted"
    />
  );
}

function filterTags(params: URLSearchParams, vessels: Vessel[], categoryName: string) {
  const tags: { id: string; type: string; label: string; clear: Record<string, string | null> }[] = [];
  const sort = params.get("sort");
  if (sort === "price_asc" || sort === "price_desc") {
    tags.push({
      id: "sort",
      type: "Цена",
      label: sort === "price_asc" ? "Дешевле" : "Дороже",
      clear: { sort: null },
    });
  } else if (sort === "old") {
    tags.push({ id: "sort", type: "Дата", label: "Старые", clear: { sort: null } });
  }
  const category = params.get("category");
  if (category) {
    tags.push({
      id: "category",
      type: "Тип судна",
      label: vessels.find((item) => item.slug === category)?.name || categoryName || category,
      clear: { category: null },
    });
  }
  const registered = params.get("registered");
  if (registered === "yes" || registered === "no") {
    tags.push({
      id: "registered",
      type: "Регистрация",
      label: registered === "yes" ? "Регистрат" : "Нерегистрат",
      clear: { registered: null },
    });
  }
  return tags;
}
