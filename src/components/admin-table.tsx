"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { adminHref, type AdminBulkOption, type AdminColumn, type AdminFilter, type AdminRow } from "@/lib/admin-list";
import { secondaryClass } from "@/components/styles";

export function AdminTable({
  title,
  basePath,
  exportHref,
  columns,
  rows,
  filters,
  bulk,
  bulkAction,
  q,
  sort,
  dir,
  page,
  pages,
  total,
  pageSize,
  error,
  saved,
  toolbar,
  footer,
}: {
  title: string;
  basePath: string;
  exportHref: string;
  columns: AdminColumn[];
  rows: AdminRow[];
  filters: AdminFilter[];
  bulk: AdminBulkOption[];
  bulkAction: (formData: FormData) => Promise<void>;
  q: string;
  sort: string;
  dir: "asc" | "desc";
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  error?: string;
  saved?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
}) {
  const token = rows.map((row) => row.id).join("|");
  const [seen, setSeen] = useState(token);
  const [picked, setPicked] = useState<string[]>([]);
  const [op, setOp] = useState(bulk[0]?.value ?? "");
  if (token !== seen) {
    setSeen(token);
    setPicked([]);
  }
  const query = {
    q,
    sort,
    dir,
    ...Object.fromEntries(filters.map((filter) => [filter.key, filter.value])),
  };
  const back = adminHref(basePath, { ...query, page });
  const pageIds = rows.map((row) => row.id);
  const allOn = pageIds.length > 0 && pageIds.every((id) => picked.includes(id));
  const needsReason = bulk.find((item) => item.value === op)?.needsReason;
  const excel = picked.length
    ? `${exportHref}${exportHref.includes("?") ? "&" : "?"}ids=${encodeURIComponent(picked.join(","))}`
    : exportHref;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const around = pageLinks(page, pages);

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {toolbar ? <div className="flex flex-wrap gap-2">{toolbar}</div> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <label className="min-w-0 flex-1 text-sm">
          Поиск
          <input name="q" defaultValue={q} className="field search mt-1 w-full min-w-40 border border-line bg-white px-4 py-2 text-sm outline-none focus:border-navy" />
        </label>
        {filters.map((filter) => (
          <label key={filter.key} className="text-sm">
            {filter.label}
            <select name={filter.key} defaultValue={filter.value} className="field mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy">
              {filter.options.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="btn bg-navy px-4 py-2 text-sm font-semibold text-white">Найти</button>
        <Link href={basePath} className={secondaryClass}>
          Сбросить
        </Link>
      </form>
      <form action={bulkAction} className="grid gap-3">
        <input type="hidden" name="back" value={back} />
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f8fc] text-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Выбрать все на странице"
                    checked={allOn}
                    onChange={() => setPicked(allOn ? [] : pageIds)}
                  />
                </th>
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-3 font-medium">
                    {column.sort ? (
                      <Link
                        href={adminHref(basePath, {
                          ...query,
                          sort: column.sort,
                          dir: sort === column.sort ? (dir === "asc" ? "desc" : "asc") : (column.firstDir ?? "asc"),
                        })}
                        className="text-ink"
                      >
                        {column.label}
                        {sort === column.sort ? (dir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th className="w-10 px-2 py-3">
                  <span className="sr-only">Просмотр</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={`border-t border-line ${picked.includes(row.id) ? "bg-foam" : ""}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      name="id"
                      value={row.id}
                      aria-label={`Выбрать ${row.cells[columns[0]?.key ?? ""] || row.id}`}
                      checked={picked.includes(row.id)}
                      onChange={() => toggle(row.id)}
                    />
                  </td>
                  {columns.map((column, index) => (
                    <td key={column.key} className="max-w-80 px-3 py-3 align-top">
                      {index === 0 ? (
                        <Link href={row.href} className="font-semibold text-navy">
                          {row.cells[column.key] || "—"}
                        </Link>
                      ) : (
                        row.cells[column.key] || "—"
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-3">
                    <Link
                      href={row.href}
                      title="Подробнее"
                      aria-label={`Подробнее: ${row.cells[columns[0]?.key ?? ""] || row.id}`}
                      className="flex h-8 w-8 items-center justify-center text-navy"
                    >
                      <EyeIcon />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="px-4 py-6 text-sm text-muted">Ничего не найдено.</p> : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Действие с выбранными
            <select name="op" value={op} onChange={(event) => setOp(event.target.value)} className="field mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy">
              {bulk.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {needsReason ? (
            <label className="min-w-48 flex-1 text-sm">
              Причина
              <input name="reason" required className="field mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy" />
            </label>
          ) : null}
          <button className="btn bg-copper px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={picked.length === 0}>
            Применить
          </button>
          <a href={excel} className={secondaryClass}>
            Excel{picked.length ? ` (${picked.length})` : ""}
          </a>
          <span className="text-sm text-muted">Выбрано: {picked.length}</span>
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          {from}–{to} из {total}
        </p>
        {pages > 1 ? (
          <nav className="flex flex-wrap gap-1" aria-label="Страницы">
            <PageLink href={adminHref(basePath, { ...query, page: page - 1 })} disabled={page <= 1}>
              Назад
            </PageLink>
            {around.map((item) => (
              <PageLink key={item} href={adminHref(basePath, { ...query, page: item })} current={item === page}>
                {item}
              </PageLink>
            ))}
            <PageLink href={adminHref(basePath, { ...query, page: page + 1 })} disabled={page >= pages}>
              Дальше
            </PageLink>
          </nav>
        ) : null}
      </div>
      {footer}
    </div>
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

function PageLink({
  href,
  children,
  disabled,
  current,
}: {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  current?: boolean;
}) {
  if (disabled) return <span className="px-2 py-1 text-muted">{children}</span>;
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={`rounded-lg px-2 py-1 ${current ? "bg-navy text-white" : "hover:bg-foam"}`}>
      {children}
    </Link>
  );
}

function pageLinks(page: number, pages: number) {
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const links: number[] = [];
  for (let item = start; item <= end; item += 1) links.push(item);
  return links;
}
