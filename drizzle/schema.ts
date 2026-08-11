import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const inventorySnapshots = mysqlTable("inventory_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: timestamp("snapshotDate").notNull(),
  status: mysqlEnum("status", ["confirmed"]).default("confirmed").notNull(),
  unitCount: int("unitCount").notNull(),
  sourceFileCount: int("sourceFileCount").notNull(),
  completenessScore: decimal("completenessScore", { precision: 5, scale: 2 }).notNull(),
  warningMessage: text("warningMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const snapshotAssets = mysqlTable("snapshot_assets", {
  id: int("id").autoincrement().primaryKey(),
  snapshotId: int("snapshotId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: text("storageUrl").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inventoryUnits = mysqlTable("inventory_units", {
  id: int("id").autoincrement().primaryKey(),
  snapshotId: int("snapshotId").notNull(),
  unitKey: varchar("unitKey", { length: 255 }).notNull(),
  societyName: varchar("societyName", { length: 255 }).notNull(),
  unitNumber: varchar("unitNumber", { length: 100 }).notNull(),
  areaSqft: decimal("areaSqft", { precision: 10, scale: 2 }),
  configuration: varchar("configuration", { length: 100 }),
  floor: varchar("floor", { length: 50 }),
  locality: varchar("locality", { length: 255 }),
  status: varchar("status", { length: 100 }),
  askPriceDisplay: varchar("askPriceDisplay", { length: 100 }),
  askPriceValue: decimal("askPriceValue", { precision: 15, scale: 2 }),
  isMarkedNew: boolean("isMarkedNew").default(false).notNull(),
  firstSourcedAt: timestamp("firstSourcedAt").notNull(),
  lastSeenAt: timestamp("lastSeenAt").notNull(),
  active: boolean("active").default(true).notNull(),
});

export const changeEvents = mysqlTable("change_events", {
  id: int("id").autoincrement().primaryKey(),
  snapshotId: int("snapshotId").notNull(),
  unitKey: varchar("unitKey", { length: 255 }).notNull(),
  eventType: mysqlEnum("eventType", ["sourced", "existing", "updated", "sold", "reappeared", "potentially_sold", "price_changed"]).notNull(),
  beforeJson: text("beforeJson"),
  afterJson: text("afterJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type InventoryUnit = typeof inventoryUnits.$inferSelect;
export type Snapshot = typeof inventorySnapshots.$inferSelect;
