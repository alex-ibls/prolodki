"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { catalogHref, catalogParamsFromLocation } from "@/lib/sef";

export function CatalogSearch({ paths }: { paths: Record<string, string> }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const query = catalogParamsFromLocation(pathname, params).get("q") ?? "";
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = catalogParamsFromLocation(pathname, params);
    next.delete("page");
    const text = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (text) next.set("q", text);
    else next.delete("q");
    setDraft(text);
    router.push(catalogHref(next, paths));
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 flex-1 lg:min-w-56">
      <input
        type="search"
        name="q"
        value={draft}
        aria-label="Поиск"
        placeholder="Название, бренд, модель"
        className="field search h-10 w-full border border-white/70 bg-white px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-copper"
        onChange={(event) => setDraft(event.target.value)}
      />
    </form>
  );
}
