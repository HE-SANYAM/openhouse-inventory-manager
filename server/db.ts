import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, changeEvents, inventorySnapshots, inventoryUnits, snapshotAssets, users } from "../drizzle/schema";
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
export { changeEvents, inventorySnapshots, inventoryUnits, snapshotAssets };
