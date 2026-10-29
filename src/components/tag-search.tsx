"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  activeFilterChips,
  matchCatalogTags,
  matchFilters,
  type CatalogTag,
  type FilterField,
  type FilterSuggestion,
} from "@/lib/catalog-tags";

type Suggestion =
  | { kind: "tag"; id: string; label: string; detail: string; group: string; tag: CatalogTag }
  | { kind: "filter"; id: string; label: string; detail: string; group: string; filter: FilterSuggestion };

export function TagSearch({ tags, filters }: { tags: CatalogTag[]; filters: FilterField[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = tags.filter((tag) => params.get(tag.param) === tag.value);
  const chips = activeFilterChips(filters, params);
  const taken = useMemo(() => new Set(selected.map((tag) => tag.id)), [selected]);
  const suggestions = useMemo<Suggestion[]>(() => {
    const filtersMatched = matchFilters(filters, draft).map((filter) => ({
      kind: "filter" as const,
      id: filter.id,
      label: filter.label,
      detail: filter.detail,
      group: "Фильтр",
      filter,
    }));
    const tagsMatched = matchCatalogTags(tags, draft, taken).map((tag) => ({
      kind: "tag" as const,
      id: tag.id,
      label: tag.label,
      detail: tag.detail,
      group: tag.group,
      tag,
    }));
    return [...filtersMatched, ...tagsMatched].slice(0, 8);
  }, [filters, tags, draft, taken]);
  const query = params.get("q") ?? "";
  const canSearch = draft.trim().length > 0;
  const optionCount = suggestions.length + (canSearch ? 1 : 0);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const text = next.toString();
    router.push(text ? `/?${text}` : "/");
  }

  function choose(item: Suggestion) {
    if (item.kind === "filter" && item.filter.draft) {
      setDraft(item.filter.draft);
      setActive(0);
      setOpen(true);
      field.current?.focus();
      return;
    }
    if (item.kind === "filter" && item.filter.changes) go(item.filter.changes);
    else if (item.kind === "tag") go({ [item.tag.param]: item.tag.value });
    setDraft("");
    setActive(0);
    setOpen(false);
  }

  function searchText() {
    const text = draft.trim();
    if (!text) return;
    go({ q: text });
    setDraft("");
    setActive(0);
    setOpen(false);
  }

  function remove(tag: CatalogTag) {
    go({ [tag.param]: null });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && optionCount > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % optionCount);
      return;
    }
    if (event.key === "ArrowUp" && optionCount > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index - 1 + optionCount) % optionCount);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (open && suggestions[active]) choose(suggestions[active]);
      else if (canSearch) searchText();
      return;
    }
    if (event.key === "Backspace" && draft === "") {
      const lastFilter = chips.at(-1);
      const last = selected.at(-1);
      if (query) go({ q: null });
      else if (lastFilter) go(lastFilter.clear);
      else if (last) remove(last);
    }
  }

  const shown = open && optionCount > 0;

  return (
    <div ref={box} className="relative min-w-0 flex-1 lg:min-w-56">
      <div
        className="field flex min-h-10 flex-wrap items-center gap-1 border border-line bg-paper px-2 py-1 focus-within:border-navy"
        onClick={() => field.current?.focus()}
      >
        {selected.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className="tag bg-white px-2 py-0.5 text-sm text-navy"
            onClick={(event) => {
              event.stopPropagation();
              remove(tag);
            }}
          >
            {tag.label} ×
          </button>
        ))}
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="tag bg-white px-2 py-0.5 text-sm text-navy"
            onClick={(event) => {
              event.stopPropagation();
              go(chip.clear);
            }}
          >
            {chip.label} ×
          </button>
        ))}
        {query ? (
          <button
            type="button"
            className="tag bg-white px-2 py-0.5 text-sm text-navy"
            onClick={(event) => {
              event.stopPropagation();
              go({ q: null });
            }}
          >
            {query} ×
          </button>
        ) : null}
        <input
          ref={field}
          value={draft}
          role="combobox"
          aria-label="Каталог"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={selected.length || chips.length || query ? "" : "Раздел, бренд или фильтр"}
          className="min-w-36 flex-1 bg-transparent px-2 py-1 text-sm text-ink outline-none"
          onChange={(event) => {
            setDraft(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {shown ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(20rem,50vh)] overflow-auto rounded-2xl border border-line bg-white py-1 shadow-xl"
        >
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-paper ${index === active ? "bg-paper" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(item)}
              >
                <span>
                  <Highlight text={item.label} query={draft} />
                  {item.detail && item.detail !== item.label ? (
                    <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-muted">{item.group}</span>
              </button>
            </li>
          ))}
          {canSearch ? (
            <li role="option" aria-selected={active === suggestions.length}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left text-sm hover:bg-paper ${active === suggestions.length ? "bg-paper" : ""}`}
                onMouseEnter={() => setActive(suggestions.length)}
                onClick={searchText}
              >
                Искать «{draft.trim()}»
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase("ru");
  const index = text.toLocaleLowerCase("ru").indexOf(needle);
  if (!needle || index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-navy">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}
