import { cancelOrderAction, transitionLineAction } from "@/actions/store";
import { CrumbTitle } from "@/components/breadcrumbs";
import { secondaryClass } from "@/components/styles";
import { formatRub, orderCode } from "@/lib/format";
import { fulfillmentLabel, lineStatusLabel, orderStatusLabel, paymentLabel } from "@/lib/labels";
import { canManageLine, deriveOrderStatus } from "@/lib/orders";
import type { CurrentUser } from "@/lib/session";

type Line = {
  id: string;
  title: string;
  qty: number;
  priceKopeks: number;
  lineStatus: "placed" | "confirmed" | "completed" | "cancelled";
  sellerUserId: string | null;
  organizationId: string | null;
};

type OrderShape = {
  id: string;
  orderNo: number;
  buyerId: string | null;
  paymentMethod: "invoice" | "cash" | "agreement";
  fulfillment: "pickup" | "delivery_agreed";
  contactName: string;
  phone: string;
  city: string;
  comment: string;
  createdAt: Date;
  items: Line[];
};

export function OrderView({
  order,
  user,
  isBuyer,
  back,
}: {
  order: OrderShape;
  user: CurrentUser | null;
  isBuyer: boolean;
  back: string;
}) {
  const lines = isBuyer || !user ? order.items : order.items.filter((line) => canManageLine(user, line));
  const status = deriveOrderStatus(lines);
  return (
    <article className="rounded-3xl border border-line bg-card p-5">
      <CrumbTitle label={`Заказ ${orderCode(order.orderNo)}`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Заказ {orderCode(order.orderNo)}</h1>
          <p className="text-sm text-muted">
            {orderStatusLabel[status]} · {paymentLabel[order.paymentMethod]} · {fulfillmentLabel[order.fulfillment]}
          </p>
        </div>
        {isBuyer && status === "placed" ? (
          <form action={cancelOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className={secondaryClass}>Отменить заказ</button>
          </form>
        ) : null}
      </div>
      <p className="mt-3 text-sm">
        {order.contactName}, {order.phone}
        {order.city ? `, ${order.city}` : ""}
      </p>
      {order.comment ? <p className="mt-2 text-sm text-muted">{order.comment}</p> : null}
      <ul className="mt-4 divide-y divide-line">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p>{line.title}</p>
              <p className="text-sm text-muted">
                {line.qty} × {formatRub(line.priceKopeks)} · {lineStatusLabel[line.lineStatus]}
              </p>
            </div>
            {user && canManageLine(user, line) ? (
              <div className="flex gap-2">
                {line.lineStatus === "placed" ? (
                  <>
                    <LineButton itemId={line.id} orderId={order.id} next="confirmed" back={back} label="Подтвердить" />
                    <LineButton itemId={line.id} orderId={order.id} next="cancelled" back={back} label="Отменить" />
                  </>
                ) : null}
                {line.lineStatus === "confirmed" ? (
                  <LineButton itemId={line.id} orderId={order.id} next="completed" back={back} label="Завершить" />
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

function LineButton({
  itemId,
  orderId,
  next,
  back,
  label,
}: {
  itemId: string;
  orderId: string;
  next: string;
  back: string;
  label: string;
}) {
  return (
    <form action={transitionLineAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="back" value={back} />
      <button className={secondaryClass}>{label}</button>
    </form>
  );
}
