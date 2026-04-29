import { pgTable, uuid, text, timestamp, decimal, integer, boolean, pgEnum, date, uniqueIndex } from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const teamRoleEnum = pgEnum("team_role", [
  "owner", "manager", "seller"
]);
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending", "accepted", "expired", "revoked"
]);
export const taskStatusEnum = pgEnum("task_status", [
  "a_faire", "en_cours", "fait"
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "haute", "normale", "basse"
]);

export const productCategoryEnum = pgEnum("product_category", [
  "sacs", "chaussures", "vetements", "accessoires", "montres", "bijoux", "autre"
]);
export const productConditionEnum = pgEnum("product_condition", [
  "neuf_avec_etiquettes", "neuf_sans_etiquettes", "comme_neuf", "tres_bon", "bon", "correct"
]);
export const productStatusEnum = pgEnum("product_status", [
  "en_stock", "en_vente", "reserve", "vendu", "expedie", "livre", "retourne"
]);
export const saleChannelEnum = pgEnum("sale_channel", [
  "vinted", "vestiaire", "stockx", "prive", "autre"
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "virement", "especes", "cb", "paypal", "plateforme", "autre"
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "en_attente", "recu", "rembourse"
]);
export const shippingStatusEnum = pgEnum("shipping_status", [
  "a_expedier", "expedie", "livre", "retourne"
]);
export const invoiceTypeEnum = pgEnum("invoice_type", [
  "vente", "sourcing", "personal_shopping"
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "brouillon", "envoyee", "payee", "annulee"
]);
export const sourcingStatusEnum = pgEnum("sourcing_status", [
  "ouvert", "en_recherche", "trouve", "achete", "livre", "facture", "annule"
]);
export const psStatusEnum = pgEnum("ps_status", [
  "planifie", "en_cours", "termine", "facture", "annule"
]);
export const purchaseCategoryEnum = pgEnum("purchase_category", [
  "stock", "transport", "emballage", "outils", "autre"
]);
export const shippingPaidByEnum = pgEnum("shipping_paid_by", [
  "vendeur", "acheteur", "offert"
]);

// ── Tables ─────────────────────────────────────────────
// Every table has a user_id column referencing auth.users for multi-tenant isolation.

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  sku: text("sku").notNull(),
  title: text("title").notNull(),
  brand: text("brand").notNull(),
  model: text("model"),
  category: productCategoryEnum("category").notNull().default("autre"),
  size: text("size"),
  color: text("color"),
  condition: productConditionEnum("condition").notNull().default("bon"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  purchaseCurrency: text("purchase_currency").default("EUR"),
  purchasePriceEur: decimal("purchase_price_eur", { precision: 10, scale: 2 }),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
  purchaseSource: text("purchase_source"),
  purchaseDate: date("purchase_date"),
  status: productStatusEnum("status").notNull().default("en_stock"),
  listedOn: text("listed_on").array(),
  location: text("location"),
  serialNumber: text("serial_number"),
  authenticityProof: text("authenticity_proof"),
  notes: text("notes"),
  images: text("images").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  productId: uuid("product_id").references(() => products.id),
  customerId: uuid("customer_id").references(() => customers.id),
  channel: saleChannelEnum("channel").notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  platformFees: decimal("platform_fees", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  shippingPaidBy: shippingPaidByEnum("shipping_paid_by").default("acheteur"),
  netRevenue: decimal("net_revenue", { precision: 10, scale: 2 }),
  margin: decimal("margin", { precision: 10, scale: 2 }),
  marginPct: decimal("margin_pct", { precision: 5, scale: 2 }),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").default("en_attente"),
  trackingNumber: text("tracking_number"),
  shippingStatus: shippingStatusEnum("shipping_status"),
  invoiceNumber: text("invoice_number"),
  soldAt: timestamp("sold_at").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  instagram: text("instagram"),
  address: text("address"),
  city: text("city"),
  preferredBrands: text("preferred_brands").array(),
  preferredSizes: text("preferred_sizes"),
  preferredCategories: text("preferred_categories").array(),
  budgetRange: text("budget_range"),
  vip: boolean("vip").default(false),
  notes: text("notes"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  lastPurchaseAt: timestamp("last_purchase_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: invoiceTypeEnum("type").notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  relatedSaleId: uuid("related_sale_id").references(() => sales.id),
  relatedSourcingId: uuid("related_sourcing_id").references(() => sourcingRequests.id),
  relatedPsMissionId: uuid("related_ps_mission_id").references(() => personalShoppingMissions.id),
  amountHt: decimal("amount_ht", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default("0"),
  amountTtc: decimal("amount_ttc", { precision: 10, scale: 2 }).notNull(),
  vatMention: text("vat_mention"),
  status: invoiceStatusEnum("status").default("brouillon"),
  pdfUrl: text("pdf_url"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sourcingRequests = pgTable("sourcing_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  customerId: uuid("customer_id").references(() => customers.id),
  description: text("description").notNull(),
  brand: text("brand"),
  model: text("model"),
  targetBudget: decimal("target_budget", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }),
  status: sourcingStatusEnum("status").default("ouvert"),
  foundProductId: uuid("found_product_id").references(() => products.id),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  deadline: date("deadline"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const personalShoppingMissions = pgTable("personal_shopping_missions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  eventDate: date("event_date"),
  location: text("location"),
  status: psStatusEnum("status").default("planifie"),
  totalPurchased: decimal("total_purchased", { precision: 10, scale: 2 }).default("0"),
  totalCommission: decimal("total_commission", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const psItems = pgTable("ps_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  missionId: uuid("mission_id").references(() => personalShoppingMissions.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id).notNull(),
  description: text("description").notNull(),
  brand: text("brand"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  invoiced: boolean("invoiced").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  productId: uuid("product_id").references(() => products.id),
  description: text("description").notNull(),
  supplier: text("supplier"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  category: purchaseCategoryEnum("category").default("stock"),
  receiptUrl: text("receipt_url"),
  purchasedAt: date("purchased_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shopSettings = pgTable("shop_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  shopId: uuid("shop_id").references(() => shops.id),
  legalName: text("legal_name").notNull(),
  commercialName: text("commercial_name"),
  legalStatus: text("legal_status"),
  siret: text("siret"),
  rcs: text("rcs"),
  apeCode: text("ape_code"),
  address: text("address").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  country: text("country").default("France"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  iban: text("iban"),
  bic: text("bic"),
  bankName: text("bank_name"),
  vatSubject: boolean("vat_subject").default(false),
  vatNumber: text("vat_number"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).default("0"),
  invoicePrefix: text("invoice_prefix").default("F"),
  invoiceCounter: integer("invoice_counter").default(0),
  legalMention: text("legal_mention"),
  paymentTerms: text("payment_terms").default("Paiement comptant"),
  lateFeePct: decimal("late_fee_pct", { precision: 5, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Shops & Team ──────────────────────────────────────

export const shops = pgTable("shops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").references(() => shops.id).notNull(),
  userId: uuid("user_id").notNull(),
  role: teamRoleEnum("role").notNull().default("seller"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("team_members_shop_user_idx").on(table.shopId, table.userId),
]);

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").references(() => shops.id).notNull(),
  email: text("email").notNull(),
  role: teamRoleEnum("role").notNull().default("seller"),
  invitedBy: uuid("invited_by").notNull(),
  status: invitationStatusEnum("status").notNull().default("pending"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").references(() => shops.id).notNull(),
  userId: uuid("user_id").notNull(),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: uuid("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Tasks ─────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").references(() => shops.id).notNull(),
  createdBy: uuid("created_by").notNull(),
  assignedTo: uuid("assigned_to"),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("a_faire"),
  priority: taskPriorityEnum("priority").notNull().default("normale"),
  relatedEntity: text("related_entity"),
  relatedEntityId: uuid("related_entity_id"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Types ──────────────────────────────────────────────

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type SourcingRequest = typeof sourcingRequests.$inferSelect;
export type PersonalShoppingMission = typeof personalShoppingMissions.$inferSelect;
export type PsItem = typeof psItems.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type ShopSettings = typeof shopSettings.$inferSelect;
export type NewShopSettings = typeof shopSettings.$inferInsert;
export type Shop = typeof shops.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TeamRole = "owner" | "manager" | "seller";
