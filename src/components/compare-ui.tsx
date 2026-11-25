"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { compareHref, compareLimit } from "@/lib/compare-list";

const storageKey = "compare_ids";
const changed = "compare-change";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readCompareIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is string => typeof id === "string" && uuid.test(id)).slice(0, compareLimit);
  } catch {
    return [];
  }
}

export function writeCompareIds(ids: string[]) {
  const next = ids.filter((id) => uuid.test(id)).slice(0, compareLimit);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(changed));
  return next;
}

function toggleCompare(id: string) {
  const current = readCompareIds();
  if (current.includes(id)) return { ids: writeCompareIds(current.filter((item) => item !== id)), full: false };
  if (current.length >= compareLimit) return { ids: current, full: true };
  return { ids: writeCompareIds([...current, id]), full: false };
}

export function CompareButton({ id, variant = "inline" }: { id: string; variant?: "inline" | "card" }) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    function sync() {
      setOn(readCompareIds().includes(id));
    }
    sync();
    window.addEventListener(changed, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(changed, sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  const label = on ? "В сравнении" : "Добавить в сравнение";
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        className={
          variant === "card"
            ? "inline-flex h-9 w-9 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
            : "inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-moss bg-white text-sm font-semibold text-moss hover:border-moss-hover hover:text-moss-hover md:h-auto md:w-auto md:gap-2 md:px-3 md:py-2"
        }
        onMouseDown={variant === "card" ? (event) => event.preventDefault() : undefined}
        onClick={() => {
          const result = toggleCompare(id);
          setNote(result.full ? "Максимум 5 товаров для сравнения" : "");
        }}
      >
        <CompareIcon active={on} />
        {variant === "card" ? null : <span className="hidden md:inline">{label}</span>}
      </button>
      {note ? <span className="block px-3 pb-2 text-xs text-red-700">{note}</span> : null}
    </span>
  );
}

function CompareIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={active ? 3.2 : 1.8} aria-hidden>
      <path d="M4 7.5h12.5" strokeLinecap="round" />
      <path d="M13 4 17.5 7.5 13 11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16.5H7.5" strokeLinecap="round" />
      <path d="M11 13 6.5 16.5 11 20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CompareNavLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [href, setHref] = useState("/compare");

  useEffect(() => {
    function sync() {
      const ids = readCompareIds();
      setCount(ids.length);
      setHref(compareHref(ids));
    }
    sync();
    window.addEventListener(changed, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(changed, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const active = pathname === "/compare" || pathname.startsWith("/compare/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      Сравнение
      {count > 0 ? (
        <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-[6px] bg-moss px-1.5 text-xs font-semibold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function CompareSync({ pathIds, ids }: { pathIds: string[]; ids: string[] }) {
  const router = useRouter();
  const pathKey = pathIds.join("/");
  const idKey = ids.join("/");
  useEffect(() => {
    writeCompareIds(ids);
    if (pathKey !== idKey) router.replace(compareHref(ids));
  }, [pathKey, idKey, ids, router]);
  return null;
}

export function CompareResume() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ids = readCompareIds();
    if (ids.length) router.replace(compareHref(ids));
    else setReady(true);
  }, [router]);
  if (!ready) return null;
  return <p className="mt-6 text-sm text-muted">Добавьте товары кнопкой «Сравнить» в каталоге или на карточке. Максимум 5.</p>;
}

export function CompareRemove({ id, ids }: { id: string; ids: string[] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-navy underline"
      onClick={() => {
        const next = ids.filter((item) => item !== id);
        writeCompareIds(next);
        router.push(compareHref(next));
      }}
    >
      Убрать
    </button>
  );
}

