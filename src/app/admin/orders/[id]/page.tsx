import { notFound } from "next/navigation";
import { ErrorNote } from "@/components/catalog-ui";
import { OrderView } from "@/components/order-view";
import { requireManager } from "@/lib/guards";
import { getOrderBundle } from "@/lib/orders";
import { readQuery } from "@/lib/query";
import { companyOrg } from "@/lib/stock";

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireManager();
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const order = await getOrderBundle(id);
  if (!order) notFound();
  const org = await companyOrg();
  if (!order.items.some((line) => line.organizationId === org.id)) notFound();
  return (
    <main className="grid gap-3">
      <ErrorNote message={one("error")} />
      <OrderView order={order} user={user} isBuyer={false} back={`/admin/orders/${order.id}`} />
    </main>
  );
}
