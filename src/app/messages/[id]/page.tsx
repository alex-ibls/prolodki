import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import { getVisibleThread } from "@/lib/messages";
import { readQuery } from "@/lib/query";
import { getCurrentUser } from "@/lib/session";

export default async function GuestMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const user = await getCurrentUser();
  if (user) redirect(`/account/messages/${id}`);
  const visible = await getVisibleThread(id);
  if (!visible || visible.role !== "buyer") notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <MessageThread thread={visible.thread} back={`/messages/${id}`} error={one("error")} />
    </main>
  );
}
