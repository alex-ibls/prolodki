"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catalogHref } from "@/lib/sef";

export function priceSortChoices(search: string, paths: Record<string, string>) {
  const params = new URLSearchParams(search);
  const price = params.get("price") || legacyPrice(params.get("sort"));
  return [
    { id: "asc", label: "Дешевле", on: price === "asc", href: href(search, { price: price === "asc" ? null : "asc" }, paths) },
    { id: "desc", label: "Дороже", on: price === "desc", href: href(search, { price: price === "desc" ? null : "desc" }, paths) },
  ];
}

const iconButton = "btn inline-flex h-10 w-10 items-center justify-center border border-line bg-white text-ink hover:border-navy";

export function SortMenu({
  search,
  paths,
  align = "left",
  suspended = false,
}: {
  search: string;
  paths: Record<string, string>;
  align?: "left" | "right";
  suspended?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const sorts = priceSortChoices(search, paths);
  const sortOn = sorts.some((item) => item.on);

  useEffect(() => {
    if (suspended) setOpen(false);
  }, [suspended]);

  return (
    <div className="relative">
      <button
        type="button"
        className={`${iconButton} ${sortOn ? "border-navy text-navy" : ""}`}
        aria-label="Сортировка"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <SortIcon />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30" aria-label="Закрыть сортировку" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-40 mt-1 grid w-36 gap-1 overflow-hidden rounded border border-line bg-white p-1 ${align === "right" ? "right-0" : "left-0"}`}
            role="menu"
          >
            {sorts.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                role="menuitem"
                aria-current={item.on ? "true" : undefined}
                className={`px-3 py-2 text-sm ${item.on ? "bg-navy font-semibold text-white" : "text-ink"}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function QuickFilters({ search, paths }: { search: string; paths: Record<string, string> }) {
  return (
    <div className="mb-3 hidden md:flex">
      <SortMenu search={search} paths={paths} />
    </div>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M8 7v10" />
      <path d="M5.5 9.5 8 7l2.5 2.5" />
      <path d="M16 17V7" />
      <path d="M13.5 14.5 16 17l2.5-2.5" />
    </svg>
  );
}

function href(search: string, changes: Record<string, string | null | undefined>, paths: Record<string, string>) {
  const next = new URLSearchParams(search);
  next.delete("page");
  next.delete("date");
  next.delete("registered");
  const legacy = next.get("sort");
  if (legacy && !next.get("price")) {
    const price = legacyPrice(legacy);
    if (price) next.set("price", price);
  }
  next.delete("sort");
  for (const [key, value] of Object.entries(changes)) {
    if (!value) next.delete(key);
    else next.set(key, value);
  }
  return catalogHref(next, paths);
}

function legacyPrice(sort: string | null) {
  if (sort === "price_asc") return "asc";
  if (sort === "price_desc") return "desc";
  return "";
}
