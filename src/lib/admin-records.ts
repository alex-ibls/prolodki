import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import { categories, customers, deals, listings, nomenclature, orderItems, orders } from "@/db/schema";
import {
  adminExportLimit,
  adminPageSize,
  likePattern,
  pageWindow,
  readList,
  type AdminColumn,
  type AdminRow,
  type Reader,
  type SortDir,
} from "@/lib/admin-list";
import { allCategories } from "@/lib/catalog";
import { formatDate, formatOffer, formatRub, orderCode } from "@/lib/format";
import {
  customerSourceLabel,
  dealStatusLabel,
  lineStatusLabel,
  listingStatusLabel,
  sourceLabel,
} from "@/lib/labels";
import { deriveOrderStatus } from "@/lib/orders";
import { availableOf, companyOrg } from "@/lib/stock";
import { allBrands, categoryPath, type CategoryNode } from "@/lib/taxonomy";

type Scope = { ids?: string[]; limit?: number };
type ListState = ReturnType<typeof readList>;

export type AdminPage = {
  rows: AdminRow[];
  total: number;
  page: number;
  pages: number;
  q: string;
  sort: string;
  dir: SortDir;
  filters: Record<string, string>;
};

const dealStatuses = ["new", "in_progress", "invoiced", "won", "lost"] as const;
const customerSources = ["registration", "order", "manual"] as const;
const lineStatuses = ["placed", "confirmed", "completed", "cancelled"] as const;
const listingStatuses = ["draft", "pending_review", "published", "rejected", "reserved", "archived"] as const;
const emptyId = "00000000-0000-0000-0000-000000000000";

export const customerColumns: AdminColumn[] = [
  { key: "name", label: "Имя", sort: "name", firstDir: "asc" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "Email" },
  { key: "city", label: "Город", sort: "city", firstDir: "asc" },
  { key: "source", label: "Источник" },
  { key: "created", label: "Создан", sort: "created", firstDir: "desc" },
];

export const dealColumns: AdminColumn[] = [
  { key: "title", label: "Сделка", sort: "title", firstDir: "asc" },
  { key: "customer", label: "Клиент" },
  { key: "status", label: "Статус" },
  { key: "amount", label: "Сумма", sort: "amount", firstDir: "desc" },
  { key: "updated", label: "Обновлена", sort: "updated", firstDir: "desc" },
];

export const catalogColumns: AdminColumn[] = [
  { key: "name", label: "Название", sort: "name", firstDir: "asc" },
  { key: "path", label: "Путь" },
  { key: "parent", label: "Родитель" },
  { key: "sort", label: "Порядок", sort: "sort", firstDir: "asc" },
];

export const brandColumns: AdminColumn[] = [
  { key: "name", label: "Название", sort: "name", firstDir: "asc" },
  { key: "sort", label: "Порядок", sort: "sort", firstDir: "asc" },
  { key: "slug", label: "Адрес" },
];

export const nomenclatureColumns: AdminColumn[] = [
  { key: "sku", label: "Артикул", sort: "sku", firstDir: "asc" },
  { key: "title", label: "Название", sort: "title", firstDir: "asc" },
  { key: "category", label: "Категория" },
  { key: "price", label: "Цена", sort: "price", firstDir: "desc" },
  { key: "stock", label: "Склад", sort: "stock", firstDir: "desc" },
  { key: "reserved", label: "Резерв" },
  { key: "available", label: "Доступно", sort: "available", firstDir: "desc" },
  { key: "published", label: "Витрина" },
];

export const orderColumns: AdminColumn[] = [
  { key: "code", label: "Заказ", sort: "number", firstDir: "desc" },
  { key: "contact", label: "Контакт" },
  { key: "status", label: "Статус" },
  { key: "amount", label: "Сумма", sort: "amount", firstDir: "desc" },
  { key: "created", label: "Дата", sort: "created", firstDir: "desc" },
];

export const moderationColumns: AdminColumn[] = [
  { key: "title", label: "Объявление", sort: "title", firstDir: "asc" },
  { key: "source", label: "Источник" },
  { key: "category", label: "Категория" },
  { key: "price", label: "Цена", sort: "price", firstDir: "desc" },
  { key: "city", label: "Город" },
  { key: "status", label: "Статус" },
  { key: "created", label: "Дата", sort: "created", firstDir: "desc" },
];

export async function listCustomers(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["name", "city", "created"], "created");
  const source = oneOf(one("source"), customerSources);
  const pattern = state.q ? likePattern(state.q) : "";
  const where = whereAnd(
    source ? eq(customers.source, source) : undefined,
    pattern
      ? or(
          ilike(customers.name, pattern),
          ilike(customers.phone, pattern),
          ilike(customers.email, pattern),
          ilike(customers.city, pattern),
        )
      : undefined,
    uuidFilter(customers.id, scope?.ids),
  );
  const column = state.sort === "name" ? customers.name : state.sort === "city" ? customers.city : customers.createdAt;
  return finish(state, scope, { source }, () => counted(customers, where), async (limit, offset) => {
    const rows = await db
      .select()
      .from(customers)
      .where(where)
      .orderBy(state.dir === "asc" ? asc(column) : desc(column), asc(customers.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ({
      id: row.id,
      href: `/admin/crm/customers/${row.id}`,
      cells: {
        name: row.name,
        phone: blank(row.phone),
        email: blank(row.email),
        city: blank(row.city),
        source: customerSourceLabel[row.source],
        created: when(row.createdAt),
      },
    }));
  });
}

export async function listDeals(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["title", "amount", "updated"], "updated");
  const status = oneOf(one("status"), dealStatuses);
  const pattern = state.q ? likePattern(state.q) : "";
  const where = whereAnd(
    status ? eq(deals.status, status) : undefined,
    pattern ? or(ilike(deals.title, pattern), ilike(customers.name, pattern)) : undefined,
    uuidFilter(deals.id, scope?.ids),
  );
  const column = state.sort === "title" ? deals.title : state.sort === "amount" ? deals.amountKopeks : deals.updatedAt;
  return finish(
    state,
    scope,
    { status },
    async () => {
      const [row] = await db.select({ n: count() }).from(deals).leftJoin(customers, eq(deals.customerId, customers.id)).where(where);
      return row?.n ?? 0;
    },
    async (limit, offset) => {
      const rows = await db
        .select({
          id: deals.id,
          title: deals.title,
          amountKopeks: deals.amountKopeks,
          status: deals.status,
          updatedAt: deals.updatedAt,
          customerName: customers.name,
        })
        .from(deals)
        .leftJoin(customers, eq(deals.customerId, customers.id))
        .where(where)
        .orderBy(state.dir === "asc" ? asc(column) : desc(column), asc(deals.id))
        .limit(limit)
        .offset(offset);
      return rows.map((row) => ({
        id: row.id,
        href: `/admin/crm/deals/${row.id}`,
        cells: {
          title: row.title,
          customer: blank(row.customerName),
          status: dealStatusLabel[row.status],
          amount: formatRub(row.amountKopeks),
          updated: when(row.updatedAt),
        },
      }));
    },
  );
}

export async function listCatalog(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["name", "sort"], "sort", "asc");
  const parent = one("parent");
  const all = await allCategories();
  const byId = new Map(all.map((item) => [item.id, item]));
  const allowed = scope?.ids ? new Set(numericIds(scope.ids)) : null;
  const rows = all
    .filter((item) => {
      if (allowed && !allowed.has(item.id)) return false;
      if (parent === "root" && item.parentId !== null) return false;
      if (parent && parent !== "root" && String(item.parentId ?? "") !== parent) return false;
      if (!state.q) return true;
      const hay = `${item.name} ${categoryPath(all, item.id)}`.toLocaleLowerCase("ru");
      return hay.includes(state.q.toLocaleLowerCase("ru"));
    })
    .sort((a, b) => compareCatalog(a, b, all, state.sort, state.dir));
  return memoryPage(state, { parent }, rows, scope, (item) => ({
    id: String(item.id),
    href: `/admin/catalog/${item.id}`,
    cells: {
      name: item.name,
      path: categoryPath(all, item.id),
      parent: item.parentId ? (byId.get(item.parentId)?.name ?? "—") : "Корень",
      sort: String(item.sort),
    },
  }));
}

export async function listBrands(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["name", "sort"], "sort", "asc");
  const allowed = scope?.ids ? new Set(numericIds(scope.ids)) : null;
  const rows = (await allBrands())
    .filter((item) => {
      if (allowed && !allowed.has(item.id)) return false;
      if (!state.q) return true;
      return item.name.toLocaleLowerCase("ru").includes(state.q.toLocaleLowerCase("ru"));
    })
    .sort((a, b) => {
      const diff = state.sort === "name" ? a.name.localeCompare(b.name, "ru") : a.sort - b.sort || a.name.localeCompare(b.name, "ru");
      return state.dir === "asc" ? diff : -diff;
    });
  return memoryPage(state, {}, rows, scope, (item) => ({
    id: String(item.id),
    href: `/admin/brands/${item.id}`,
    cells: { name: item.name, sort: String(item.sort), slug: item.slug },
  }));
}

export async function listNomenclature(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["sku", "title", "price", "stock", "available"], "sku", "asc");
  const published = one("published");
  const category = one("category");
  const categoryId = Number(category);
  const pattern = state.q ? likePattern(state.q) : "";
  const where = whereAnd(
    published === "yes" ? eq(nomenclature.isPublished, true) : published === "no" ? eq(nomenclature.isPublished, false) : undefined,
    Number.isInteger(categoryId) && categoryId > 0 ? eq(nomenclature.categoryId, categoryId) : undefined,
    pattern ? or(ilike(nomenclature.sku, pattern), ilike(nomenclature.title, pattern), ilike(nomenclature.brand, pattern)) : undefined,
    uuidFilter(nomenclature.id, scope?.ids),
  );
  const available = sql`${nomenclature.quantityOnHand} - ${nomenclature.quantityReserved}`;
  const column =
    state.sort === "title"
      ? nomenclature.title
      : state.sort === "price"
        ? nomenclature.priceKopeks
        : state.sort === "stock"
          ? nomenclature.quantityOnHand
          : state.sort === "available"
            ? available
            : nomenclature.sku;
  return finish(
    state,
    scope,
    { published, category },
    async () => {
      const [row] = await db.select({ n: count() }).from(nomenclature).where(where);
      return row?.n ?? 0;
    },
    async (limit, offset) => {
      const rows = await db
        .select({
          id: nomenclature.id,
          sku: nomenclature.sku,
          title: nomenclature.title,
          priceKopeks: nomenclature.priceKopeks,
          quantityOnHand: nomenclature.quantityOnHand,
          quantityReserved: nomenclature.quantityReserved,
          isPublished: nomenclature.isPublished,
          categoryName: categories.name,
        })
        .from(nomenclature)
        .leftJoin(categories, eq(nomenclature.categoryId, categories.id))
        .where(where)
        .orderBy(state.dir === "asc" ? asc(column) : desc(column), asc(nomenclature.sku))
        .limit(limit)
        .offset(offset);
      return rows.map((row) => ({
        id: row.id,
        href: `/admin/nomenclature/${row.id}`,
        cells: {
          sku: row.sku,
          title: row.title,
          category: blank(row.categoryName),
          price: formatOffer(row.priceKopeks),
          stock: String(row.quantityOnHand),
          reserved: String(row.quantityReserved),
          available: String(availableOf(row)),
          published: row.isPublished ? "Да" : "Нет",
        },
      }));
    },
  );
}

export async function listOrders(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["number", "amount", "created"], "created");
  const status = oneOf(one("status"), lineStatuses);
  const org = await companyOrg();
  const pattern = state.q ? likePattern(state.q) : "";
  const amount = sql`(
    select coalesce(sum(oi.price_kopeks * oi.qty), 0)
    from order_items oi
    where oi.order_id = ${orders.id} and oi.organization_id = ${org.id}
  )`;
  const where = whereAnd(
    sql`exists (
      select 1 from order_items oi
      where oi.order_id = ${orders.id} and oi.organization_id = ${org.id}
    )`,
    status
      ? sql`exists (
          select 1 from order_items oi
          where oi.order_id = ${orders.id}
            and oi.organization_id = ${org.id}
            and oi.line_status::text = ${status}
        )`
      : undefined,
    pattern
      ? or(
          ilike(orders.contactName, pattern),
          ilike(orders.phone, pattern),
          sql`cast(${orders.orderNo} as text) ilike ${pattern}`,
          sql`exists (
            select 1 from order_items oi
            where oi.order_id = ${orders.id}
              and oi.organization_id = ${org.id}
              and oi.title ilike ${pattern}
          )`,
        )
      : undefined,
    uuidFilter(orders.id, scope?.ids),
  );
  const column = state.sort === "number" ? orders.orderNo : state.sort === "amount" ? amount : orders.createdAt;
  return finish(state, scope, { status }, () => counted(orders, where), async (limit, offset) => {
    const rows = await db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        contactName: orders.contactName,
        phone: orders.phone,
        createdAt: orders.createdAt,
        amount,
      })
      .from(orders)
      .where(where)
      .orderBy(state.dir === "asc" ? asc(column) : desc(column), desc(orders.orderNo))
      .limit(limit)
      .offset(offset);
    const ids = rows.map((row) => row.id);
    const lines = ids.length
      ? await db
          .select({ orderId: orderItems.orderId, lineStatus: orderItems.lineStatus })
          .from(orderItems)
          .where(and(inArray(orderItems.orderId, ids), eq(orderItems.organizationId, org.id)))
      : [];
    return rows.map((row) => {
      const own = lines.filter((line) => line.orderId === row.id);
      return {
        id: row.id,
        href: `/admin/orders/${row.id}`,
        cells: {
          code: orderCode(row.orderNo),
          contact: [row.contactName, row.phone].filter(Boolean).join(", "),
          status: lineStatusLabel[own.length ? deriveOrderStatus(own) : "placed"],
          amount: formatRub(Number(row.amount) || 0),
          created: when(row.createdAt),
        },
      };
    });
  });
}

export async function listModeration(one: Reader, scope?: Scope): Promise<AdminPage> {
  const state = readList(one, ["title", "price", "created"], "created");
  const status = oneOf(one("status") || "pending_review", [...listingStatuses, "all"] as const);
  const source = oneOf(one("source"), ["company", "individual"] as const);
  const pattern = state.q ? likePattern(state.q) : "";
  const where = whereAnd(
    status && status !== "all" ? eq(listings.status, status) : undefined,
    source ? eq(listings.source, source) : undefined,
    pattern ? or(ilike(listings.title, pattern), ilike(listings.city, pattern), ilike(listings.brand, pattern)) : undefined,
    uuidFilter(listings.id, scope?.ids),
  );
  const column = state.sort === "title" ? listings.title : state.sort === "price" ? listings.priceKopeks : listings.createdAt;
  return finish(state, scope, { status: status || "pending_review", source }, () => counted(listings, where), async (limit, offset) => {
    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        source: listings.source,
        priceKopeks: listings.priceKopeks,
        city: listings.city,
        status: listings.status,
        createdAt: listings.createdAt,
        categoryName: categories.name,
      })
      .from(listings)
      .leftJoin(categories, eq(listings.categoryId, categories.id))
      .where(where)
      .orderBy(state.dir === "asc" ? asc(column) : desc(column), asc(listings.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ({
      id: row.id,
      href: `/admin/moderation/${row.id}`,
      cells: {
        title: row.title,
        source: sourceLabel[row.source],
        category: blank(row.categoryName),
        price: formatRub(row.priceKopeks),
        city: blank(row.city),
        status: listingStatusLabel[row.status],
        created: when(row.createdAt),
      },
    }));
  });
}

const exporters = {
  customers: { file: "клиенты.xlsx", columns: customerColumns, load: listCustomers },
  deals: { file: "сделки.xlsx", columns: dealColumns, load: listDeals },
  catalog: { file: "каталог.xlsx", columns: catalogColumns, load: listCatalog },
  brands: { file: "бренды.xlsx", columns: brandColumns, load: listBrands },
  nomenclature: { file: "номенклатура.xlsx", columns: nomenclatureColumns, load: listNomenclature },
  orders: { file: "заказы.xlsx", columns: orderColumns, load: listOrders },
  moderation: { file: "модерация.xlsx", columns: moderationColumns, load: listModeration },
} as const;

export type AdminEntity = keyof typeof exporters;

export function isAdminEntity(value: string): value is AdminEntity {
  return value in exporters;
}

export async function loadAdminExport(entity: AdminEntity, one: Reader) {
  const spec = exporters[entity];
  const ids = one("ids")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 200);
  const page = await spec.load(one, { ids: ids.length ? ids : undefined, limit: adminExportLimit });
  return {
    filename: spec.file,
    headers: spec.columns.map((column) => column.label),
    rows: page.rows.map((row) => spec.columns.map((column) => row.cells[column.key] ?? "")),
  };
}

function whereAnd(...parts: (SQL | undefined)[]) {
  const list = parts.filter((part): part is SQL => Boolean(part));
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return and(...list);
}

function oneOf<T extends string>(raw: string, allowed: readonly T[]) {
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}

function uuidFilter(column: SQLWrapper, ids: string[] | undefined) {
  if (!ids) return undefined;
  return inArray(column, ids.length ? ids : [emptyId]);
}

function numericIds(ids: string[]) {
  return ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

function blank(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || "—";
}

function when(value: Date | null | undefined) {
  return value ? formatDate(value) : "—";
}

async function counted(
  table: typeof customers | typeof orders | typeof listings | typeof nomenclature,
  where: SQL | undefined,
) {
  const [row] = await db.select({ n: count() }).from(table).where(where);
  return row?.n ?? 0;
}

async function finish(
  state: ListState,
  scope: Scope | undefined,
  filters: Record<string, string>,
  countRows: () => Promise<number>,
  load: (limit: number, offset: number) => Promise<AdminRow[]>,
): Promise<AdminPage> {
  if (scope) {
    const limit = scope.ids?.length ? scope.ids.length : (scope.limit ?? adminExportLimit);
    const rows = await load(limit, 0);
    return { rows, total: rows.length, page: 1, pages: 1, q: state.q, sort: state.sort, dir: state.dir, filters };
  }
  const total = await countRows();
  const window = pageWindow(total, state);
  const rows = await load(adminPageSize, window.offset);
  return { ...window, rows, q: state.q, sort: state.sort, dir: state.dir, filters };
}

function memoryPage<T>(
  state: ListState,
  filters: Record<string, string>,
  rows: T[],
  scope: Scope | undefined,
  map: (item: T) => AdminRow,
): AdminPage {
  const window = scope ? { page: 1, pages: 1, offset: 0, total: rows.length } : pageWindow(rows.length, state);
  const limit = scope?.limit ?? adminPageSize;
  const slice = rows.slice(window.offset, window.offset + limit);
  return {
    rows: slice.map(map),
    total: scope?.ids ? slice.length : rows.length,
    page: window.page,
    pages: scope ? 1 : window.pages,
    q: state.q,
    sort: state.sort,
    dir: state.dir,
    filters,
  };
}

function compareCatalog(a: CategoryNode, b: CategoryNode, all: CategoryNode[], sort: string, dir: SortDir) {
  const diff =
    sort === "name"
      ? a.name.localeCompare(b.name, "ru")
      : a.sort - b.sort || categoryPath(all, a.id).localeCompare(categoryPath(all, b.id), "ru");
  return dir === "asc" ? diff : -diff;
}
