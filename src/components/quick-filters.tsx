"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Vessel = { slug: string; name: string };

const kinds = [
  { id: "price", label: "Цена" },
  { id: "date", label: "Дата" },
  { id: "vessel", label: "Тип судна" },
  { id: "registered", label: "Регистрация" },
] as const;

type Kind = (typeof kinds)[number]["id"];

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
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Kind | null>(null);
  const params = new URLSearchParams(search);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(search);
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const text = next.toString();
    router.push(text ? `/?${text}` : "/");
    setOpen(null);
  }

  function apply(kind: Kind, value: string) {
    if (!value) return;
    if (kind === "price") go({ sort: value });
    else if (kind === "date") go({ sort: value === "new" ? null : value });
    else if (kind === "vessel") go({ category: value });
    else go({ registered: value });
  }

  const tags = filterTags(params, vessels, categoryName);

  return (
    <div ref={root} className="mb-4 flex flex-wrap items-center gap-2">
      {kinds.map((item) => {
        const options = valuesOf(item.id, vessels);
        const current = selectedOf(item.id, params);
        const active = Boolean(current);
        return (
          <div key={item.id} className="relative">
            <button
              type="button"
              className={`tag border px-3 py-2 text-sm ${open === item.id || active ? "border-navy bg-navy font-semibold text-white" : "border-line bg-white"}`}
              aria-expanded={open === item.id}
              aria-haspopup="listbox"
              onClick={() => setOpen((value) => (value === item.id ? null : item.id))}
            >
              {item.label}
            </button>
            {open === item.id ? (
              <ul
                role="listbox"
                aria-label={item.label}
                className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-full overflow-auto rounded-2xl border border-line bg-white py-1 shadow-xl"
              >
                {options.map((option) => (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={option.value === current}
                      className={`block w-full whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-paper ${option.value === current ? "font-semibold text-navy" : ""}`}
                      onClick={() => apply(item.id, option.value)}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
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

function valuesOf(kind: Kind, vessels: Vessel[]) {
  if (kind === "price") {
    return [
      { value: "price_asc", label: "Дешевле" },
      { value: "price_desc", label: "Дороже" },
    ];
  }
  if (kind === "date") {
    return [
      { value: "new", label: "Новые" },
      { value: "old", label: "Старые" },
    ];
  }
  if (kind === "vessel") return vessels.map((item) => ({ value: item.slug, label: item.name }));
  return [
    { value: "yes", label: "Регистрат" },
    { value: "no", label: "Нерегистрат" },
  ];
}

function selectedOf(kind: Kind, params: URLSearchParams) {
  const sort = params.get("sort");
  if (kind === "price") return sort === "price_asc" || sort === "price_desc" ? sort : "";
  if (kind === "date") return sort === "old" ? "old" : "";
  if (kind === "vessel") return params.get("category") ?? "";
  const registered = params.get("registered");
  return registered === "yes" || registered === "no" ? registered : "";
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
