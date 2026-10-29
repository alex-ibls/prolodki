import Link from "next/link";
import { replyMessageAction } from "@/actions/messages";
import { CrumbTitle } from "@/components/breadcrumbs";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, inputClass } from "@/components/styles";
import { formatDate } from "@/lib/format";

type ThreadMessage = {
  id: string;
  body: string;
  fromSeller: boolean;
  createdAt: Date;
};

export function MessageThread({
  thread,
  back,
  error,
}: {
  thread: {
    id: string;
    contactName: string;
    listing: { title: string; slug: string } | null;
    messages: ThreadMessage[];
  };
  back: string;
  error?: string;
}) {
  return (
    <article className="grid gap-4">
      <CrumbTitle label={thread.listing?.title ?? "Переписка"} />
      <div>
        <h1 className="text-3xl">Сообщение</h1>
        {thread.listing ? (
          <p className="mt-2 text-sm text-muted">
            <Link href={`/product/${thread.listing.slug}`}>{thread.listing.title}</Link>
            {" · "}
            {thread.contactName}
          </p>
        ) : null}
      </div>
      <ErrorNote message={error} />
      <ul className="grid gap-3">
        {thread.messages.map((message) => (
          <li
            key={message.id}
            className={
              message.fromSeller
                ? "rounded-3xl bg-[#e7f3ff] px-4 py-3 text-ink"
                : "rounded-3xl border border-line bg-card px-4 py-3"
            }
          >
            <p className="text-xs opacity-70">
              {message.fromSeller ? "Продавец" : thread.contactName} · {formatDate(message.createdAt)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
          </li>
        ))}
      </ul>
      <form action={replyMessageAction} className="grid gap-3">
        <input type="hidden" name="threadId" value={thread.id} />
        <input type="hidden" name="back" value={back} />
        <label className="text-sm">
          Ответ
          <textarea name="body" required rows={4} className={inputClass} />
        </label>
        <button className={buttonClass}>Отправить</button>
      </form>
    </article>
  );
}
