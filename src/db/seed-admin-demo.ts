import "dotenv/config";
import { eq, like } from "drizzle-orm";
import { client, db } from "./index";
import { brands, categories, customers, deals, listings, orderItems, orders, users } from "./schema";
import { companyOrg } from "../lib/stock";

const batch = 24;

const firstNames = ["Иван", "Мария", "Сергей", "Ольга", "Павел", "Елена", "Никита", "Анна"];
const lastNames = ["Орлов", "Соколова", "Белов", "Крылова", "Морозов", "Волкова", "Лебедев", "Павлова"];
const cities = ["Химки", "Клин", "Москва", "Зеленоград", "Долгопрудный", "Мытищи"];
const sources = ["manual", "order", "registration"] as const;
const dealStatuses = ["new", "in_progress", "invoiced", "won", "lost"] as const;
const lineStatuses = ["placed", "confirmed", "completed", "cancelled"] as const;
const payments = ["invoice", "cash", "agreement"] as const;
const fulfillments = ["pickup", "delivery_agreed"] as const;
const listingStatuses = ["pending_review", "pending_review", "pending_review", "rejected", "draft"] as const;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

function person(index: number) {
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

async function main() {
  const manager = await db.query.users.findFirst({ where: eq(users.email, "manager@prolodki.test") });
  const seller = await db.query.users.findFirst({ where: eq(users.email, "private@prolodki.test") });
  if (!seller) throw new Error("Нет частного продавца private@prolodki.test");
  const leaf = await db.query.categories.findFirst({ where: eq(categories.slug, "pp") });
  const root = await db.query.categories.findFirst({ where: eq(categories.slug, "motor-boats") });
  if (!leaf || !root) throw new Error("Нет базовых категорий каталога");
  const org = await companyOrg();

  const customerIds: string[] = [];
  for (let index = 1; index <= batch; index += 1) {
    const email = `demo-crm-${String(index).padStart(2, "0")}@prolodki.test`;
    const existing = await db.query.customers.findFirst({ where: eq(customers.email, email) });
    if (existing) {
      customerIds.push(existing.id);
      continue;
    }
    const [created] = await db
      .insert(customers)
      .values({
        name: person(index),
        phone: `79003${String(100000 + index).slice(-6)}`,
        email,
        city: cities[index % cities.length],
        source: sources[index % sources.length],
        notes: "Демо-запись для списка CRM",
        createdAt: daysAgo(batch - index),
      })
      .returning({ id: customers.id });
    customerIds.push(created.id);
  }

  for (let index = 1; index <= batch; index += 1) {
    const title = `Демо-сделка ${String(index).padStart(2, "0")}`;
    const existing = await db.query.deals.findFirst({ where: eq(deals.title, title) });
    if (existing) continue;
    const createdAt = daysAgo(batch - index);
    await db.insert(deals).values({
      customerId: customerIds[(index - 1) % customerIds.length],
      assigneeId: manager?.id ?? null,
      title,
      amountKopeks: (250_000 + index * 15_000) * 100,
      status: dealStatuses[index % dealStatuses.length],
      comment: "Демо-сделка для списка",
      createdAt,
      updatedAt: createdAt,
    });
  }

  const demoOrders = await db.select({ id: orders.id }).from(orders).where(like(orders.comment, "demo-admin-%"));
  for (let index = demoOrders.length + 1; index <= batch; index += 1) {
    const createdAt = daysAgo(batch - index);
    const [order] = await db
      .insert(orders)
      .values({
        buyerId: null,
        paymentMethod: payments[index % payments.length],
        fulfillment: fulfillments[index % fulfillments.length],
        contactName: person(index + 3),
        phone: `79004${String(100000 + index).slice(-6)}`,
        city: cities[index % cities.length],
        comment: `demo-admin-${String(index).padStart(2, "0")}`,
        createdAt,
      })
      .returning({ id: orders.id });
    await db.insert(orderItems).values({
      orderId: order.id,
      organizationId: org.id,
      title: `Демо лодка ${String(index).padStart(2, "0")}`,
      priceKopeks: (400_000 + index * 7_000) * 100,
      qty: 1 + (index % 3),
      lineStatus: lineStatuses[index % lineStatuses.length],
    });
  }

  for (let index = 1; index <= batch + 12; index += 1) {
    const slug = `demo-moderation-${String(index).padStart(2, "0")}`;
    const existing = await db.query.listings.findFirst({ where: eq(listings.slug, slug) });
    if (existing) continue;
    const status = index > batch ? "pending_review" : listingStatuses[index % listingStatuses.length];
    const createdAt = daysAgo(index);
    await db.insert(listings).values({
      source: "individual",
      sellerUserId: seller.id,
      categoryId: leaf.id,
      title: `Демо объявление ${String(index).padStart(2, "0")}`,
      slug,
      description: "Демо-объявление для очереди модерации.",
      brand: "Демо",
      model: `M-${index}`,
      condition: index % 2 === 0 ? "used" : "new",
      priceKopeks: (120_000 + index * 8_000) * 100,
      city: cities[index % cities.length],
      registered: index % 2 === 0,
      onOrder: false,
      quantity: 1,
      status,
      rejectionReason: status === "rejected" ? "Демо: не хватает фото" : "",
      createdAt,
      updatedAt: createdAt,
    });
  }

  for (let index = 1; index <= batch; index += 1) {
    const slug = `demo-brand-${String(index).padStart(2, "0")}`;
    const existing = await db.query.brands.findFirst({ where: eq(brands.slug, slug) });
    if (existing) continue;
    await db.insert(brands).values({
      slug,
      name: `Демо бренд ${String(index).padStart(2, "0")}`,
      sort: 100 + index,
    });
  }

  for (let index = 1; index <= 12; index += 1) {
    const slug = `demo-cat-${String(index).padStart(2, "0")}`;
    const existing = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (existing) continue;
    await db.insert(categories).values({
      parentId: root.id,
      slug,
      name: `Демо раздел ${String(index).padStart(2, "0")}`,
      sort: 100 + index,
    });
  }

  const [customerCount] = await db.select({ id: customers.id }).from(customers).where(like(customers.email, "demo-crm-%"));
  console.log(`демо-клиенты: ${customerIds.length}, пример: ${customerCount?.id ?? "нет"}`);
  console.log("демо-данные CRM и склада готовы");
}

main()
  .then(() => client.end())
  .catch(async (error) => {
    console.error(error);
    await client.end();
    process.exit(1);
  });
