import { formatDay } from "@/lib/format";

export const sourceLabel = {
  company: "Компания",
  individual: "Частное лицо",
} as const;

export const conditionLabel = {
  new: "Новый",
  used: "БУ",
} as const;

export function readOnOrder(raw: string) {
  const value = raw.trim().toLocaleLowerCase("ru");
  if (["1", "yes", "true", "order", "на заказ", "заказ"].includes(value)) return true;
  if (["0", "no", "false", "stock", "в наличии", "наличие"].includes(value)) return false;
  return null;
}

export const listingStatusLabel = {
  draft: "Черновик",
  pending_review: "На модерации",
  published: "Опубликовано",
  rejected: "Отклонено",
  reserved: "В резерве",
  archived: "Архив",
} as const;

export const lineStatusLabel = {
  placed: "Создан",
  awaiting_manufacturer: "Ожидает заказа у производителя",
  sent_to_manufacturer: "Заказ отправлен производителю",
  awaiting_supply: "Ожидает поставку",
  at_warehouse: "Доставлен на склад",
  shipped_to_buyer: "Отправлен покупателю",
  awaiting_buyer: "Ожидает покупателя",
  delivered: "Доставлен покупателю",
  confirmed: "Подтверждён",
  cancelled: "Отменён",
  completed: "Завершён",
} as const;

export function lineStatusText(status: keyof typeof lineStatusLabel, statusOn: string | null) {
  const label = lineStatusLabel[status];
  if ((status === "awaiting_supply" || status === "awaiting_buyer") && statusOn) {
    const day = formatDay(statusOn);
    if (day) return `${label}, ${day}`;
  }
  return label;
}

export const orderStatusLabel = lineStatusLabel;

export const paymentLabel = {
  invoice: "Счёт",
  cash: "Наличные",
  agreement: "По договорённости",
} as const;

export const fulfillmentLabel = {
  pickup: "Самовывоз",
  delivery_agreed: "Доставка по договорённости",
} as const;

export const customerSourceLabel = {
  registration: "Регистрация",
  order: "Заказ",
  manual: "Вручную",
} as const;

export const stockReasonLabel = {
  import: "Импорт",
  adjustment: "Корректировка",
  order: "Заказ",
  cancel: "Отмена",
  complete: "Списание",
  manual: "Вручную",
} as const;
