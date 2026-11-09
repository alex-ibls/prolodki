"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState } from "react";
import { buttonClass, secondaryClass } from "@/components/styles";

export type CatalogTreeItem = {
  id: number;
  parentId: number | null;
  name: string;
  sort: number;
};

const TreeContext = createContext<{
  kidsOf: (id: number | null) => CatalogTreeItem[];
  visible: (id: number) => boolean;
  isOpen: (id: number) => boolean;
  toggle: (id: number) => void;
  picked: number[];
  togglePick: (id: number) => void;
  needle: string;
} | null>(null);

export function CatalogTree({
  categories,
  initialQuery,
  error,
  saved,
  bulkAction,
  saveAction,
  deleteAction,
}: {
  categories: CatalogTreeItem[];
  initialQuery: string;
  error?: string;
  saved?: string;
  bulkAction: (formData: FormData) => Promise<void>;
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [queryFrom, setQueryFrom] = useState(initialQuery);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [closedIds, setClosedIds] = useState<number[]>([]);
  const [foldQuery, setFoldQuery] = useState(initialQuery.trim());
  const [picked, setPicked] = useState<number[]>([]);
  const [seen, setSeen] = useState(categories.map((item) => item.id).join("|"));
  if (queryFrom !== initialQuery) {
    setQueryFrom(initialQuery);
    setQuery(initialQuery);
  }
  const token = categories.map((item) => item.id).join("|");
  if (token !== seen) {
    setSeen(token);
    setPicked([]);
  }

  const needle = query.trim().toLocaleLowerCase("ru");
  if (foldQuery !== needle) {
    setFoldQuery(needle);
    setOpenIds([]);
    setClosedIds([]);
  }

  const byParent = useMemo(() => {
    const map = new Map<number | null, CatalogTreeItem[]>();
    for (const item of categories) {
      const key = item.parentId ?? null;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru"));
    return map;
  }, [categories]);

  const matchIds = useMemo(() => {
    if (!needle) return null;
    const ids = new Set<number>();
    const walk = (parentId: number | null): boolean => {
      let hit = false;
      for (const item of byParent.get(parentId) ?? []) {
        const self = item.name.toLocaleLowerCase("ru").includes(needle);
        const below = walk(item.id);
        if (self || below) {
          ids.add(item.id);
          hit = true;
        }
      }
      return hit;
    };
    walk(null);
    return ids;
  }, [byParent, needle]);

  function kidsOf(id: number | null) {
    return byParent.get(id) ?? [];
  }

  function visible(id: number) {
    return !matchIds || matchIds.has(id);
  }

  function isOpen(id: number) {
    if (needle) return !closedIds.includes(id);
    return openIds.includes(id);
  }

  function toggle(id: number) {
    if (needle) {
      setClosedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
      return;
    }
    setOpenIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function togglePick(id: number) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function shownIds(parentId: number | null, into: number[]) {
    for (const item of kidsOf(parentId)) {
      if (!visible(item.id)) continue;
      into.push(item.id);
      if (kidsOf(item.id).some((child) => visible(child.id)) && isOpen(item.id)) shownIds(item.id, into);
    }
    return into;
  }

  const shown = shownIds(null, []);
  const allOn = shown.length > 0 && shown.every((id) => picked.includes(id));
  const roots = (byParent.get(null) ?? []).filter((item) => visible(item.id));
  const back = needle ? `/admin/catalog?q=${encodeURIComponent(query.trim())}` : "/admin/catalog";
  const excel = `/admin/export?entity=catalog${needle ? `&q=${encodeURIComponent(query.trim())}` : ""}${picked.length ? `&ids=${picked.join(",")}` : ""}`;
  const branchIds = categories.filter((item) => kidsOf(item.id).length > 0).map((item) => item.id);
  const rendered = categories.filter((item) => visible(item.id)).map((item) => item.id);
  const formKey = categories.map((item) => `${item.id}:${item.name}:${item.sort}`).join("|");

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl sm:text-3xl">Каталог</h1>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-sm">
          Поиск
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field search mt-1 w-full min-w-40 border border-line bg-white px-4 py-2 text-sm outline-none focus:border-navy"
          />
        </label>
        <button type="button" className={secondaryClass} onClick={() => (needle ? setClosedIds([]) : setOpenIds(branchIds))}>
          Развернуть всё
        </button>
        <button type="button" className={secondaryClass} onClick={() => (needle ? setClosedIds(branchIds) : setOpenIds([]))}>
          Свернуть всё
        </button>
      </div>
      <form id="catalog-delete" action={deleteAction}>
        <input type="hidden" name="back" value={back} />
        <input id="catalog-delete-id" type="hidden" name="id" />
      </form>
      <form id="catalog-bulk" action={bulkAction}>
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="op" value="delete" />
        {picked
          .filter((id) => !rendered.includes(id))
          .map((id) => (
            <input key={id} type="hidden" name="id" value={id} />
          ))}
      </form>
      <form key={formKey} id="catalog-save" action={saveAction} className="grid gap-3">
        <button className="sr-only">Сохранить</button>
        <input type="hidden" name="back" value={back} />
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex items-center gap-2 bg-[#f4f8fc] px-3 py-3 text-sm text-muted">
            <span className="w-8 shrink-0" />
            <input
              type="checkbox"
              form="catalog-bulk"
              aria-label="Выбрать видимые разделы"
              checked={allOn}
              onChange={() => setPicked(allOn ? [] : shown)}
            />
            <span className="min-w-0 flex-1 font-medium">Название</span>
            <span className="w-20 shrink-0 text-center font-medium">Порядок</span>
            <span className="w-8 shrink-0" />
            <span className="w-8 shrink-0" />
          </div>
          {roots.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Ничего не найдено.</p>
          ) : (
            <TreeContext.Provider value={{ kidsOf, visible, isOpen, toggle, picked, togglePick, needle }}>
              <ul>
                {roots.map((item) => (
                  <Branch key={item.id} item={item} depth={0} />
                ))}
              </ul>
            </TreeContext.Provider>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={buttonClass}>Сохранить</button>
          <button form="catalog-bulk" className="btn bg-copper px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={picked.length === 0}>
            Удалить выбранные
          </button>
          <a href={excel} className={secondaryClass}>
            Excel{picked.length ? ` (${picked.length})` : ""}
          </a>
          <span className="text-sm text-muted">
            Показано: {shown.length} · выбрано: {picked.length}
          </span>
        </div>
      </form>
    </div>
  );
}

function Branch({ item, depth }: { item: CatalogTreeItem; depth: number }) {
  const tree = useContext(TreeContext);
  if (!tree) return null;
  const kids = tree.kidsOf(item.id);
  const visibleKids = kids.filter((child) => tree.visible(child.id));
  const expanded = visibleKids.length > 0 && tree.isOpen(item.id);
  const hit = tree.needle && item.name.toLocaleLowerCase("ru").includes(tree.needle);
  return (
    <li>
      <div
        className={`flex min-h-11 flex-wrap items-center gap-2 border-t border-line py-2 pr-3 text-sm ${hit ? "bg-foam" : ""}`}
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <input type="hidden" name="rowId" value={item.id} />
        {visibleKids.length > 0 ? (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-navy"
            aria-expanded={expanded}
            aria-label={expanded ? `Свернуть ${item.name}` : `Развернуть ${item.name}`}
            onClick={() => tree.toggle(item.id)}
          >
            <Caret open={expanded} />
          </button>
        ) : (
          <span className="h-8 w-8 shrink-0" />
        )}
        <input
          type="checkbox"
          form="catalog-bulk"
          name="id"
          value={item.id}
          aria-label={`Выбрать ${item.name}`}
          checked={tree.picked.includes(item.id)}
          onChange={() => tree.togglePick(item.id)}
        />
        <input
          name="name"
          defaultValue={item.name}
          aria-label={`Название ${item.name}`}
          className="field min-w-40 flex-1 border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink outline-none focus:border-navy"
        />
        {kids.length > 0 ? <span className="text-xs text-muted">{kids.length}</span> : null}
        <input
          name="sort"
          defaultValue={item.sort}
          inputMode="numeric"
          aria-label={`Порядок ${item.name}`}
          className="field w-20 shrink-0 border border-line bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-navy"
        />
        <Link
          href={`/admin/catalog/${item.id}`}
          title="Подробнее"
          aria-label={`Подробнее: ${item.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-navy"
        >
          <EyeIcon />
        </Link>
        <button
          type="submit"
          form="catalog-delete"
          title="Удалить"
          aria-label={`Удалить ${item.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-copper"
          onClick={() => {
            const input = document.getElementById("catalog-delete-id");
            if (input instanceof HTMLInputElement) input.value = String(item.id);
          }}
        >
          <TrashIcon />
        </button>
      </div>
      {visibleKids.length > 0 ? (
        <ul hidden={!expanded}>
          {visibleKids.map((child) => (
            <Branch key={child.id} item={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${open ? "rotate-90" : ""}`} aria-hidden>
      <path d="M7 4.5 13 10 7 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
