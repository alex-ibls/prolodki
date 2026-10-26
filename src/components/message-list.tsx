import Link from "next/link";
import { formatDate } from "@/lib/format";

type Row = {
  id: string;
  contactName: string;
  updatedAt: Date;
  listing: { title: string } | null;
  messages: { body: string; createdAt: Date }[];
};

export function MessageList({ rows, hrefBase }: { rows: Row[]; hrefBase: string }) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-muted">Пока пусто.</p>;
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((row) => {
        const last = row.messages[row.messages.length - 1];
        return (
          <li key={row.id}>
            <Link href={`${hrefBase}/${row.id}`} className="block rounded-3xl border border-line bg-card p-4">
              <span className="font-display">{row.listing?.title ?? "Объявление"}</span>
              <span className="ml-3 text-sm text-muted">
                {row.contactName} · {formatDate(row.updatedAt)}
              </span>
              {last ? <p className="mt-2 line-clamp-2 text-sm text-muted">{last.body}</p> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
