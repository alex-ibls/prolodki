import { notFound } from "next/navigation";
import { MessageThread } from "@/components/message-thread";
import { getVisibleThread } from "@/lib/messages";
import { readQuery } from "@/lib/query";

export default async function AccountMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const visible = await getVisibleThread(id);
  if (!visible) notFound();
  return <MessageThread thread={visible.thread} back={`/account/messages/${id}`} error={one("error")} />;
}
