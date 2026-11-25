import { cancelOrderAction, transitionLineAction } from "@/actions/store";
import { CrumbTitle } from "@/components/breadcrumbs";
import { buttonClass, secondaryClass } from "@/components/styles";
import { formatRub, orderCode } from "@/lib/format";
import { fulfillmentLabel, lineStatusLabel, lineStatusText, orderStatusLabel, paymentLabel } from "@/lib/labels";
import { canManageLine, deriveOrderStatus, managerActions, supplyPath, type OrderStatus } from "@/lib/orders";
import type { CurrentUser } from "@/lib/session";

type Line = {
  id: string;
  title: string;
  qty: number;
  priceKopeks: number;
  lineStatus: OrderStatus;
  supply: boolean;
  settled: boolean;
  statusOn: string | null;
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
  const buyerCanCancel = isBuyer && lines.length > 0 && lines.every((line) => line.lineStatus === "placed");
  return (
    <article className="rounded-3xl border border-line bg-card p-4">
      <CrumbTitle label={`Заказ ${orderCode(order.orderNo)}`} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">Заказ {orderCode(order.orderNo)}</h1>
          <p className="text-sm text-muted">
            {orderStatusLabel[status]} · {paymentLabel[order.paymentMethod]} · {fulfillmentLabel[order.fulfillment]}
          </p>
        </div>
        {buyerCanCancel ? (
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
        {lines.map((line) => {
          const actions = user && canManageLine(user, line) ? managerActions(line, order.fulfillment) : [];
          const path = line.supply && line.lineStatus !== "cancelled" ? supplyPath(order.fulfillment) : [];
          return (
            <li key={line.id} className="grid gap-3 py-3">
              <div>
                <p>{line.title}</p>
                <p className="text-sm text-muted">
                  {line.qty} × {formatRub(line.priceKopeks)} · {lineStatusText(line.lineStatus, line.statusOn)}
                </p>
                {line.supply ? <p className="text-sm text-muted">Нет в наличии, остаток не меняется</p> : null}
              </div>
              {path.length > 0 ? (
                <ol className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {path.map((step) => (
                    <li key={step} className={step === line.lineStatus ? "font-semibold text-deep" : "text-muted"}>
                      {lineStatusLabel[step]}
                    </li>
                  ))}
                </ol>
              ) : null}
              {actions.length > 0 ? (
                <div className="flex flex-wrap items-end gap-2">
                  {actions.map((action) => (
                    <form key={action.next} action={transitionLineAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="itemId" value={line.id} />
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="next" value={action.next} />
                      <input type="hidden" name="back" value={back} />
                      {action.date ? (
                        <label className="grid text-xs text-muted">
                          {action.date === "supply" ? "Дата поставки" : "Дата"}
                          <input type="date" name="statusOn" required className="border border-line bg-white px-3 py-2 text-sm text-ink" />
                        </label>
                      ) : null}
                      <button className={action.next === "cancelled" ? secondaryClass : buttonClass}>{action.label}</button>
                    </form>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
