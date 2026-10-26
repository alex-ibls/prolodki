import { MessageList } from "@/components/message-list";
import { buyerThreads, sellerThreads } from "@/lib/messages";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Сообщения" };

export default async function AccountMessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [incoming, outgoing] = await Promise.all([sellerThreads(user), buyerThreads()]);
  const sells = Boolean(user.sellerProfile) || user.staffRole === "manager";
  return (
    <main>
      <h1 className="text-3xl">Сообщения</h1>
      {sells ? (
        <section className="mt-6">
          <h2 className="text-xl">От покупателей</h2>
          <MessageList rows={incoming} hrefBase="/account/messages" />
        </section>
      ) : null}
      <section className="mt-6">
        <h2 className="text-xl">Мои обращения</h2>
        <MessageList rows={outgoing} hrefBase="/account/messages" />
      </section>
    </main>
  );
}
