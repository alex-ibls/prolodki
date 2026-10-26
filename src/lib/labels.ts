export const sourceLabel = {
  company: "Компания",
  individual: "Частное лицо",
} as const;

export const conditionLabel = {
  new: "Новый",
  used: "БУ",
} as const;

export const listingStatusLabel = {
  draft: "Черновик",
  pending_review: "На модерации",
  published: "Опубликовано",
  rejected: "Отклонено",
  reserved: "В резерве",
  archived: "Архив",
} as const;

export const lineStatusLabel = {
  placed: "Размещён",
  confirmed: "Подтверждён",
  completed: "Завершён",
  cancelled: "Отменён",
} as const;

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

export const dealStatusLabel = {
  new: "Новая",
  in_progress: "В работе",
  invoiced: "Счёт",
  won: "Выиграна",
  lost: "Проиграна",
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
