export type Crumb = { href: string; label: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const labels: Record<string, string> = {
  catalog: "Каталог",
  cart: "Корзина",
  checkout: "Оформление",
  favorites: "Избранное",
  history: "История",
  login: "Вход",
  register: "Регистрация",
  "verify-email": "Подтверждение email",
  orders: "Заказы",
  messages: "Сообщения",
  account: "Кабинет",
  listings: "Объявления",
  sales: "Продажи",
  letter: "Письмо",
  brands: "Бренды",
  nomenclature: "Номенклатура",
  import: "Загрузка",
  moderation: "Модерация",
  deals: "Сделки",
};

export function crumbsForPath(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];
  if (segments[0] === "product" && segments[1]) {
    return [
      { href: "/", label: "Главная" },
      { href: `/product/${segments[1]}`, label: "Объявление" },
    ];
  }
  if (segments[0] === "checkout") {
    return [
      { href: "/", label: "Главная" },
      { href: "/cart", label: "Корзина" },
      { href: "/checkout", label: "Оформление" },
    ];
  }

  const crumbs: Crumb[] = [{ href: "/", label: "Главная" }];
  let href = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const parent = segments[index - 1];
    href += `/${segment}`;
    if (segment === "admin") continue;
    if (segment === "crm") {
      if (segments[index + 1] === "deals") continue;
      crumbs.push({ href: "/admin/crm", label: "Клиенты" });
      continue;
    }
    if (segment === "customers") continue;
    const label = segmentLabel(segment, parent, segments[0]);
    if (!label) continue;
    crumbs.push({ href, label });
  }
  return crumbs.length > 1 ? crumbs : [];
}

function segmentLabel(segment: string, parent: string | undefined, root: string) {
  if (uuid.test(segment)) {
    if (parent === "orders") return "Заказ";
    if (parent === "messages") return "Переписка";
    if (parent === "listings") return "Объявление";
    if (parent === "nomenclature") return "Позиция";
    if (parent === "customers") return "Клиент";
    if (parent === "deals") return "Сделка";
    return "Страница";
  }
  if (segment === "new") {
    if (parent === "listings") return "Новое объявление";
    if (parent === "customers") return "Новый клиент";
    if (parent === "nomenclature") return "Новая позиция";
    return "Новое";
  }
  if (segment === "orders" && root === "admin") return "Заказы компании";
  if (segment === "catalog" && root === "admin") return "Структура каталога";
  return labels[segment] ?? null;
}
