import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, changeEvents, inventorySnapshots, inventoryUnits, snapshotAssets, systemConfig, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0];
}
export async function getLatestSnapshot() {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(inventorySnapshots).orderBy(desc(inventorySnapshots.snapshotDate)).limit(1); return rows[0];
}
export async function getUnitsForSnapshot(snapshotId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(inventoryUnits).where(eq(inventoryUnits.snapshotId, snapshotId));
}
export async function getLatestActiveUnits() {
  const latest = await getLatestSnapshot(); if (!latest) return [];
  const units = await getUnitsForSnapshot(latest.id); return units.filter(u => u.active);
}
export async function resetInventoryData(dbOverride?: any) {
  const db = dbOverride ?? await getDb(); if (!db) throw new Error("Database unavailable");
  await db.delete(changeEvents);
  await db.delete(snapshotAssets);
  await db.delete(inventoryUnits);
  await db.delete(inventorySnapshots);
  return { success: true as const };
}

export async function getConfig(key: string): Promise<string | null> {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(systemConfig).where(eq(systemConfig.configKey, key)).limit(1);
  return rows.length > 0 ? rows[0].configValue : null;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(systemConfig).values({ configKey: key, configValue: value })
    .onDuplicateKeyUpdate({ set: { configValue: value, updatedAt: new Date() } });
}

export async function addManualUnit(unit: {
  societyName: string;
  unitNumber: string;
  areaSqft?: number;
  configuration?: string;
  floor?: string;
  locality?: string;
  marketRegion?: string;
  zone?: string;
  microZone?: string;
  status?: string;
  askPriceDisplay?: string;
}) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  let latest = await getLatestSnapshot();
  if (!latest) {
    const res = await db.insert(inventorySnapshots).values({
      snapshotDate: new Date(),
      status: "confirmed",
      unitCount: 0,
      sourceFileCount: 0,
      completenessScore: "100.00",
      warningMessage: "Manual baseline snapshot",
    });
    const insertedId = Number(res[0].insertId);
    latest = { id: insertedId, snapshotDate: new Date(), status: "confirmed", unitCount: 0, sourceFileCount: 0, completenessScore: "100.00", warningMessage: null, createdAt: new Date() };
  }
  const unitKey = `${unit.societyName.toLowerCase().trim()}-${unit.unitNumber.toLowerCase().trim()}`;
  await db.insert(inventoryUnits).values({
    snapshotId: latest.id,
    unitKey,
    societyName: unit.societyName,
    unitNumber: unit.unitNumber,
    areaSqft: unit.areaSqft ? String(unit.areaSqft) : null,
    configuration: unit.configuration || null,
    floor: unit.floor || null,
    locality: unit.locality || null,
    marketRegion: unit.marketRegion || "Gurgaon",
    zone: unit.zone || "SPR",
    microZone: unit.microZone || "Sector 67",
    status: unit.status || "Available",
    askPriceDisplay: unit.askPriceDisplay || "On Request",
    isMarkedNew: true,
    firstSourcedAt: new Date(),
    lastSeenAt: new Date(),
    active: true,
  });
  return { success: true as const };
}

export async function updateManualUnit(id: number, unit: {
  societyName: string;
  unitNumber: string;
  areaSqft?: number;
  configuration?: string;
  floor?: string;
  locality?: string;
  marketRegion?: string;
  zone?: string;
  microZone?: string;
  status?: string;
  askPriceDisplay?: string;
  active?: boolean;
}) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(inventoryUnits).set({
    societyName: unit.societyName,
    unitNumber: unit.unitNumber,
    areaSqft: unit.areaSqft !== undefined ? String(unit.areaSqft) : undefined,
    configuration: unit.configuration,
    floor: unit.floor,
    locality: unit.locality,
    marketRegion: unit.marketRegion,
    zone: unit.zone,
    microZone: unit.microZone,
    status: unit.status,
    askPriceDisplay: unit.askPriceDisplay,
    active: unit.active,
    lastSeenAt: new Date(),
  }).where(eq(inventoryUnits.id, id));
  return { success: true as const };
}

export async function deleteInventoryUnit(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.delete(inventoryUnits).where(eq(inventoryUnits.id, id));
  return { success: true as const };
}

export { changeEvents, inventorySnapshots, inventoryUnits, snapshotAssets, systemConfig };
