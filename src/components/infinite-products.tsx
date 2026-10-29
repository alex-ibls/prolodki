"use client";

import { useEffect, useRef, useState } from "react";
import { ProductGrid, type CardData } from "@/components/catalog-ui";
import { secondaryClass } from "@/components/styles";

export function InfiniteProducts({
  initialItems,
  pages,
  search,
}: {
  initialItems: CardData[];
  pages: number;
  search: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || page >= pages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || busy.current) return;
        busy.current = true;
        setLoading(true);
        setError(false);
        const params = new URLSearchParams(search);
        params.set("page", String(page + 1));
        fetch(`/api/catalog?${params}`)
          .then((response) => {
            if (!response.ok) throw new Error("load");
            return response.json() as Promise<{ rows: CardData[] }>;
          })
          .then((data) => {
            setItems((current) => {
              const seen = new Set(current.map((item) => item.slug));
              return [...current, ...data.rows.filter((item) => !seen.has(item.slug))];
            });
            setPage((current) => current + 1);
          })
          .catch(() => setError(true))
          .finally(() => {
            busy.current = false;
            setLoading(false);
          });
      },
      { rootMargin: "480px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, pages, retry, search]);

  return (
    <>
      <ProductGrid items={items} />
      {page < pages ? (
        <div ref={sentinel} className="flex justify-center py-6">
          {error ? (
            <button type="button" className={secondaryClass} onClick={() => setRetry((value) => value + 1)}>
              Повторить
            </button>
          ) : (
            <p className="text-sm text-muted">{loading ? "Загрузка…" : ""}</p>
          )}
        </div>
      ) : null}
    </>
  );
}
