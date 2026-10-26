import { notFound } from "next/navigation";
import { OrderView } from "@/components/order-view";
import { ErrorNote } from "@/components/catalog-ui";
import { getOrderBundle } from "@/lib/orders";
import { readQuery } from "@/lib/query";
import { getCurrentUser } from "@/lib/session";
import { canManageLine } from "@/lib/orders";

export default async function BuyerOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const user = await getCurrentUser();
  if (!user) return null;
  const order = await getOrderBundle(id);
  if (!order) notFound();
  const allowed = order.buyerId === user.id || order.items.some((line) => canManageLine(user, line));
  if (!allowed) notFound();
  return (
    <main className="grid gap-3">
      <ErrorNote message={one("error")} />
      <OrderView
        order={order}
        user={user}
        isBuyer={order.buyerId === user.id}
        back={`/account/orders/${order.id}`}
      />
    </main>
  );
}
