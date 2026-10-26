import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const staffRole = pgEnum("staff_role", ["moderator", "manager"]);
export const orgKind = pgEnum("org_kind", ["company"]);
export const sellerType = pgEnum("seller_type", ["individual"]);
export const listingSource = pgEnum("listing_source", ["company", "individual"]);
export const itemCondition = pgEnum("item_condition", ["new", "used"]);
export const listingStatus = pgEnum("listing_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "reserved",
  "archived",
]);
export const paymentMethod = pgEnum("payment_method", [
  "invoice",
  "cash",
  "agreement",
]);
export const fulfillment = pgEnum("fulfillment", ["pickup", "delivery_agreed"]);
export const lineStatus = pgEnum("line_status", [
  "placed",
  "confirmed",
  "completed",
  "cancelled",
]);
export const customerSource = pgEnum("customer_source", [
  "registration",
  "order",
  "manual",
]);
export const dealStatus = pgEnum("deal_status", [
  "new",
  "in_progress",
  "invoiced",
  "won",
  "lost",
]);
export const stockReason = pgEnum("stock_reason", [
  "import",
  "adjustment",
  "order",
  "cancel",
  "complete",
  "manual",
]);
export const listingEventKind = pgEnum("listing_event_kind", [
  "view",
  "favorite_add",
  "favorite_remove",
  "cart_add",
  "phone_reveal",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull().default(""),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  emailVerifyToken: text("email_verify_token").unique(),
  staffRole: staffRole("staff_role"),
  createdAt: timestamps.createdAt,
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: orgKind("kind").notNull(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  phone: text("phone").notNull().default(""),
  createdAt: timestamps.createdAt,
});

export const sellerProfiles = pgTable("seller_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  type: sellerType("type").notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdAt: timestamps.createdAt,
});

export const categories = pgTable("categories", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  parentId: integer("parent_id"),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const brands = pgTable("brands", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull().unique(),
  sort: integer("sort").notNull().default(0),
});

export const attributeDefs = pgTable("attribute_defs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default(""),
  filterable: boolean("filterable").notNull().default(true),
  cardOrder: integer("card_order").notNull().default(0),
});

export const nomenclature = pgTable("nomenclature", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  title: text("title").notNull(),
  brandId: integer("brand_id").references(() => brands.id),
  brand: text("brand").notNull().default(""),
  model: text("model").notNull().default(""),
  year: integer("year"),
  description: text("description").notNull().default(""),
  priceKopeks: integer("price_kopeks").notNull(),
  compareAtKopeks: integer("compare_at_kopeks"),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  city: text("city").notNull().default(""),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
});

export const nomenclatureAttributes = pgTable(
  "nomenclature_attributes",
  {
    nomenclatureId: uuid("nomenclature_id")
      .notNull()
      .references(() => nomenclature.id),
    attributeDefId: integer("attribute_def_id")
      .notNull()
      .references(() => attributeDefs.id),
    valueNumber: doublePrecision("value_number"),
  },
  (table) => [
    primaryKey({ columns: [table.nomenclatureId, table.attributeDefId] }),
  ],
);

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: listingSource("source").notNull(),
  sellerUserId: uuid("seller_user_id").references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  nomenclatureId: uuid("nomenclature_id").unique().references(() => nomenclature.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  brandId: integer("brand_id").references(() => brands.id),
  brand: text("brand").notNull().default(""),
  model: text("model").notNull().default(""),
  year: integer("year"),
  condition: itemCondition("condition").notNull(),
  priceKopeks: integer("price_kopeks").notNull(),
  compareAtKopeks: integer("compare_at_kopeks"),
  city: text("city").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  status: listingStatus("status").notNull().default("draft"),
  rejectionReason: text("rejection_reason").notNull().default(""),
  searchVector: tsvector("search_vector"),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
});

export const listingAttributes = pgTable(
  "listing_attributes",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    attributeDefId: integer("attribute_def_id")
      .notNull()
      .references(() => attributeDefs.id),
    valueNumber: doublePrecision("value_number"),
  },
  (table) => [primaryKey({ columns: [table.listingId, table.attributeDefId] })],
);

export const listingImages = pgTable("listing_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id),
  path: text("path").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  nomenclatureId: uuid("nomenclature_id")
    .notNull()
    .references(() => nomenclature.id),
  delta: integer("delta").notNull(),
  reason: stockReason("reason").notNull(),
  note: text("note").notNull().default(""),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamps.createdAt,
});

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    guestToken: text("guest_token"),
    updatedAt: timestamps.updatedAt,
  },
  (table) => [
    uniqueIndex("carts_user_id_unique").on(table.userId),
    uniqueIndex("carts_guest_token_unique").on(table.guestToken),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    qty: integer("qty").notNull(),
  },
  (table) => [primaryKey({ columns: [table.cartId, table.listingId] })],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNo: integer("order_no").generatedAlwaysAsIdentity(),
    buyerId: uuid("buyer_id").references(() => users.id),
    guestToken: text("guest_token"),
    paymentMethod: paymentMethod("payment_method").notNull(),
    fulfillment: fulfillment("fulfillment").notNull(),
    contactName: text("contact_name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull().default(""),
    comment: text("comment").notNull().default(""),
    createdAt: timestamps.createdAt,
  },
  (table) => [index("orders_guest_token_idx").on(table.guestToken)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  listingId: uuid("listing_id").references(() => listings.id),
  nomenclatureId: uuid("nomenclature_id").references(() => nomenclature.id),
  sellerUserId: uuid("seller_user_id").references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  title: text("title").notNull(),
  priceKopeks: integer("price_kopeks").notNull(),
  qty: integer("qty").notNull(),
  lineStatus: lineStatus("line_status").notNull().default("placed"),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").unique().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  source: customerSource("source").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamps.createdAt,
});

export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  orderId: uuid("order_id").unique().references(() => orders.id),
  assigneeId: uuid("assignee_id").references(() => users.id),
  title: text("title").notNull(),
  amountKopeks: integer("amount_kopeks").notNull().default(0),
  status: dealStatus("status").notNull().default("new"),
  comment: text("comment").notNull().default(""),
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
});

export const dealNotes = pgTable("deal_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  authorId: uuid("author_id").references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamps.createdAt,
});

export const listingEvents = pgTable(
  "listing_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    kind: listingEventKind("kind").notNull(),
    userId: uuid("user_id").references(() => users.id),
    guestToken: text("guest_token"),
    createdAt: timestamps.createdAt,
  },
  (table) => [index("listing_events_listing_kind_idx").on(table.listingId, table.kind)],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    userId: uuid("user_id").references(() => users.id),
    guestToken: text("guest_token"),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex("favorites_user_listing").on(table.listingId, table.userId),
    uniqueIndex("favorites_guest_listing").on(table.listingId, table.guestToken),
  ],
);

export const listingThreads = pgTable(
  "listing_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    buyerUserId: uuid("buyer_user_id").references(() => users.id),
    guestToken: text("guest_token"),
    contactName: text("contact_name").notNull(),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  },
  (table) => [
    index("listing_threads_listing_idx").on(table.listingId),
    uniqueIndex("listing_threads_buyer_listing").on(table.listingId, table.buyerUserId),
    uniqueIndex("listing_threads_guest_listing").on(table.listingId, table.guestToken),
  ],
);

export const listingMessages = pgTable("listing_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => listingThreads.id),
  body: text("body").notNull(),
  fromSeller: boolean("from_seller").notNull().default(false),
  authorUserId: uuid("author_user_id").references(() => users.id),
  createdAt: timestamps.createdAt,
});

export const outboundEmails = pgTable("outbound_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  kind: text("kind").notNull(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  bodyHtml: text("body_html").notNull(),
  createdAt: timestamps.createdAt,
});

export const usersRelations = relations(users, ({ one }) => ({
  sellerProfile: one(sellerProfiles, {
    fields: [users.id],
    references: [sellerProfiles.userId],
  }),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({ one }) => ({
  user: one(users, { fields: [sellerProfiles.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [sellerProfiles.organizationId],
    references: [organizations.id],
  }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  listings: many(listings),
  nomenclature: many(nomenclature),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  attributeDefs: many(attributeDefs),
}));

export const attributeDefsRelations = relations(attributeDefs, ({ one }) => ({
  category: one(categories, {
    fields: [attributeDefs.categoryId],
    references: [categories.id],
  }),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  brandRef: one(brands, {
    fields: [listings.brandId],
    references: [brands.id],
  }),
  images: many(listingImages),
  attributes: many(listingAttributes),
  nomenclature: one(nomenclature, {
    fields: [listings.nomenclatureId],
    references: [nomenclature.id],
  }),
  seller: one(users, {
    fields: [listings.sellerUserId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [listings.organizationId],
    references: [organizations.id],
  }),
}));

export const listingThreadsRelations = relations(listingThreads, ({ one, many }) => ({
  listing: one(listings, {
    fields: [listingThreads.listingId],
    references: [listings.id],
  }),
  buyer: one(users, {
    fields: [listingThreads.buyerUserId],
    references: [users.id],
  }),
  messages: many(listingMessages),
}));

export const listingMessagesRelations = relations(listingMessages, ({ one }) => ({
  thread: one(listingThreads, {
    fields: [listingMessages.threadId],
    references: [listingThreads.id],
  }),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, {
    fields: [listingImages.listingId],
    references: [listings.id],
  }),
}));

export const listingAttributesRelations = relations(listingAttributes, ({ one }) => ({
  listing: one(listings, {
    fields: [listingAttributes.listingId],
    references: [listings.id],
  }),
  definition: one(attributeDefs, {
    fields: [listingAttributes.attributeDefId],
    references: [attributeDefs.id],
  }),
}));

export const nomenclatureRelations = relations(nomenclature, ({ one, many }) => ({
  category: one(categories, {
    fields: [nomenclature.categoryId],
    references: [categories.id],
  }),
  brandRef: one(brands, {
    fields: [nomenclature.brandId],
    references: [brands.id],
  }),
  attributes: many(nomenclatureAttributes),
  movements: many(stockMovements),
  listing: one(listings, {
    fields: [nomenclature.id],
    references: [listings.nomenclatureId],
  }),
}));

export const nomenclatureAttributesRelations = relations(
  nomenclatureAttributes,
  ({ one }) => ({
    nomenclature: one(nomenclature, {
      fields: [nomenclatureAttributes.nomenclatureId],
      references: [nomenclature.id],
    }),
    definition: one(attributeDefs, {
      fields: [nomenclatureAttributes.attributeDefId],
      references: [attributeDefs.id],
    }),
  }),
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  nomenclature: one(nomenclature, {
    fields: [stockMovements.nomenclatureId],
    references: [nomenclature.id],
  }),
  user: one(users, { fields: [stockMovements.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  customer: one(customers, {
    fields: [deals.customerId],
    references: [customers.id],
  }),
  assignee: one(users, { fields: [deals.assigneeId], references: [users.id] }),
  order: one(orders, { fields: [deals.orderId], references: [orders.id] }),
  notes: many(dealNotes),
}));

export const dealNotesRelations = relations(dealNotes, ({ one }) => ({
  deal: one(deals, { fields: [dealNotes.dealId], references: [deals.id] }),
  author: one(users, { fields: [dealNotes.authorId], references: [users.id] }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  listing: one(listings, {
    fields: [cartItems.listingId],
    references: [listings.id],
  }),
}));
