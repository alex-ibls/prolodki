import { redirect } from "next/navigation";
import { MessageList } from "@/components/message-list";
import { buyerThreads } from "@/lib/messages";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Сообщения" };

export default async function GuestMessagesPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/messages");
  const rows = await buyerThreads();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl">Сообщения</h1>
      <p className="mt-2 text-sm text-muted">Переписка с продавцами в этом браузере.</p>
      <MessageList rows={rows} hrefBase="/messages" />
    </main>
  );
}
