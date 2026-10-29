"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { crumbsForPath } from "@/lib/breadcrumbs";

const CrumbTitleContext = createContext<{
  title: string | null;
  setTitle: (title: string | null) => void;
} | null>(null);

export function CrumbProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return <CrumbTitleContext.Provider value={value}>{children}</CrumbTitleContext.Provider>;
}

export function CrumbTitle({ label }: { label: string }) {
  const setTitle = useContext(CrumbTitleContext)?.setTitle;
  useEffect(() => {
    setTitle?.(label);
    return () => setTitle?.(null);
  }, [setTitle, label]);
  return null;
}

export function BreadcrumbBar() {
  const pathname = usePathname();
  const title = useContext(CrumbTitleContext)?.title ?? null;
  const crumbs = crumbsForPath(pathname);
  if (crumbs.length < 2) return null;
  if (title) crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], label: title };
  return (
    <nav aria-label="Хлебные крошки" className="mx-auto w-full max-w-6xl px-4 pt-3 text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {current ? (
                <span aria-current="page" className="truncate text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="shrink-0 hover:text-navy">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
