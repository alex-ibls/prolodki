import { notFound, redirect } from "next/navigation";
import { ErrorNote } from "@/components/catalog-ui";
import { OrderView } from "@/components/order-view";
import { readGuestToken } from "@/lib/guest";
import { getOrderBundle } from "@/lib/orders";
import { readQuery } from "@/lib/query";
import { getCurrentUser } from "@/lib/session";

export default async function GuestOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const user = await getCurrentUser();
  if (user) redirect(`/account/orders/${id}`);
  const token = await readGuestToken();
  const order = await getOrderBundle(id);
  if (!order || !token || order.buyerId || order.guestToken !== token) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <ErrorNote message={one("error")} />
      <OrderView order={order} user={null} isBuyer back={`/orders/${order.id}`} />
    </main>
  );
}
