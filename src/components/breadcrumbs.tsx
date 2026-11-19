"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { crumbsForPath } from "@/lib/breadcrumbs";

type CrumbLabel = { label: string; href?: string };

const CrumbTitleContext = createContext<{
  title: CrumbLabel | null;
  setTitle: (title: CrumbLabel | null) => void;
} | null>(null);

export function CrumbProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<CrumbLabel | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return <CrumbTitleContext.Provider value={value}>{children}</CrumbTitleContext.Provider>;
}

export function CrumbTitle({ label, href }: { label: string; href?: string }) {
  const setTitle = useContext(CrumbTitleContext)?.setTitle;
  useEffect(() => {
    setTitle?.({ label, href });
    return () => setTitle?.(null);
  }, [setTitle, label, href]);
  return null;
}

export function BreadcrumbBar({ names = {} }: { names?: Record<string, string> }) {
  const pathname = usePathname();
  const title = useContext(CrumbTitleContext)?.title ?? null;
  const crumbs = crumbsForPath(pathname, names);
  if (crumbs.length < 2) return null;
  if (title) {
    const index = title.href ? crumbs.findIndex((crumb) => crumb.href === title.href) : crumbs.length - 1;
    if (index >= 0) crumbs[index] = { ...crumbs[index], label: title.label };
  }
  return (
    <nav aria-label="Хлебные крошки" className="mx-auto w-full max-w-6xl px-3 pb-4 pt-4 text-xs sm:px-4 sm:pb-4 sm:pt-6 sm:text-sm">
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
