import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { changeEvents, getDb, getLatestActiveUnits, getLatestSnapshot, getUnitsForSnapshot, inventorySnapshots, inventoryUnits, snapshotAssets, resetInventoryData } from "./db";
import { validateInventoryResetPassword } from "./resetSecurity";
import { compareUnits, completenessScore, incompleteUploadWarning, mergeExtractedUnits, unitKey } from "@shared/inventoryLogic";
import { parseExtractionResponse } from "./ocrParsing";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can reset inventory" }); return next(); });

const unitSchema = { type: "object", properties: { societyName: { type: "string" }, unitNumber: { type: "string" }, areaSqft: { type: ["number", "null"] }, configuration: { type: ["string", "null"] }, floor: { type: ["string", "null"] }, locality: { type: ["string", "null"] }, status: { type: ["string", "null"] }, askPriceDisplay: { type: ["string", "null"] }, askPriceValue: { type: ["number", "null"] }, isMarkedNew: { type: "boolean" } }, required: ["societyName", "unitNumber", "areaSqft", "configuration", "floor", "locality", "status", "askPriceDisplay", "askPriceValue", "isMarkedNew"], additionalProperties: false };

const extractionPrompt = "Extract every visible real-estate inventory row from this single screenshot. Return only JSON with a units array. Required fields: societyName, unitNumber, areaSqft, configuration, floor, locality, status, askPriceDisplay, askPriceValue, isMarkedNew. Preserve displayed price and convert Indian pricing such as 90 Lacs to 9000000 and 1.09 Cr to 10900000. Normalize unit spacing such as D- 1407 to D-1407. The red NEW badge is isMarkedNew, not sourcing classification. If a field is not visible, return null.";

async function extractUnitsFromImage(dataUrl: string) {
  const response = await invokeLLM({ messages: [{ role: "system", content: "You extract real-estate inventory tables from screenshots. Return only structured JSON." }, { role: "user", content: [{ type: "text", text: extractionPrompt }, { type: "image_url", image_url: { url: dataUrl, detail: "high" } }] }], response_format: { type: "json_schema", json_schema: { name: "inventory_extract", strict: true, schema: { type: "object", properties: { units: { type: "array", items: unitSchema } }, required: ["units"], additionalProperties: false } } } });
  return parseExtractionResponse(response.choices?.[0]?.message?.content).units as any[];
}

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  dashboard: protectedProcedure.query(async () => {
    const db = await getDb(); const active = await getLatestActiveUnits(); const latest = await getLatestSnapshot();
    if (!db || !latest) return { active: 0, sourced: 0, sold: 0, net: 0, updated: 0, priceChanges: 0, trend: [] as Array<{ date: string; count: number }> };
    const events = await db.select().from(changeEvents).where(eq(changeEvents.snapshotId, latest.id));
    const snapshots = await db.select().from(inventorySnapshots).orderBy(desc(inventorySnapshots.snapshotDate)).limit(8);
    return { active: active.length, sourced: events.filter(e => e.eventType === "sourced" || e.eventType === "reappeared").length, sold: events.filter(e => e.eventType === "potentially_sold").length, net: events.filter(e => e.eventType === "sourced" || e.eventType === "reappeared").length - events.filter(e => e.eventType === "potentially_sold").length, updated: events.filter(e => e.eventType === "updated").length, priceChanges: events.filter(e => e.eventType === "price_changed").length, trend: snapshots.reverse().map(s => ({ date: new Date(s.snapshotDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: s.unitCount })) };
  }),
  inventory: protectedProcedure.input(z.object({ search: z.string().optional(), status: z.string().optional(), sort: z.enum(["updated", "price", "area"]).optional() }).optional()).query(async ({ input }) => {
    let units = await getLatestActiveUnits(); if (input?.search) { const q = input.search.toLowerCase(); units = units.filter(u => `${u.societyName} ${u.unitNumber} ${u.locality ?? ""}`.toLowerCase().includes(q)); } if (input?.status && input.status !== "all") units = units.filter(u => u.status === input.status); if (input?.sort === "price") units.sort((a, b) => Number(b.askPriceValue ?? 0) - Number(a.askPriceValue ?? 0)); if (input?.sort === "area") units.sort((a, b) => Number(b.areaSqft ?? 0) - Number(a.areaSqft ?? 0)); if (input?.sort === "updated") units.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()); return units;
  }),
  sourced: protectedProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ event: changeEvents, unit: inventoryUnits }).from(changeEvents).innerJoin(inventoryUnits, eq(changeEvents.unitKey, inventoryUnits.unitKey)).where(and(eq(changeEvents.eventType, "sourced"), eq(changeEvents.snapshotId, inventoryUnits.snapshotId))).orderBy(desc(changeEvents.createdAt)); }),
  sold: protectedProcedure.query(async () => { const db = await getDb(); if (!db) return []; const events = await db.select().from(changeEvents).where(eq(changeEvents.eventType, "sold")).orderBy(desc(changeEvents.createdAt)); const unique = new Map<string, any>(); for (const event of events) if (!unique.has(event.unitKey)) unique.set(event.unitKey, { event, unit: JSON.parse(event.beforeJson || event.afterJson || "{}") }); return Array.from(unique.values()); }),
  history: protectedProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(inventorySnapshots).orderBy(desc(inventorySnapshots.snapshotDate)); }),
  snapshotAssets: protectedProcedure.input(z.object({ snapshotId: z.number() })).query(async ({ input }) => { const db = await getDb(); if (!db) return []; return db.select().from(snapshotAssets).where(eq(snapshotAssets.snapshotId, input.snapshotId)); }),
  extract: protectedProcedure.input(z.object({ files: z.array(z.object({ name: z.string(), mimeType: z.string(), dataUrl: z.string() })).min(1) })).mutation(async ({ input }) => {
    const assets = await Promise.all(input.files.map(async f => { const base64 = f.dataUrl.split(",")[1] || ""; const { key, url } = await storagePut(`inventory-uploads/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, Buffer.from(base64, "base64"), f.mimeType); return { ...f, key, url }; }));
    const extractedByImage: any[][] = []; const coverage: Array<{ fileName: string; rowCount: number; status: "processed" | "failed"; error?: string }> = []; for (const asset of assets) { try { const rows = await extractUnitsFromImage(asset.dataUrl); extractedByImage.push(rows); coverage.push({ fileName: asset.name, rowCount: rows.length, status: "processed" }); } catch (error) { extractedByImage.push([]); coverage.push({ fileName: asset.name, rowCount: 0, status: "failed", error: error instanceof Error ? error.message : "OCR failed" }); } } const deduped = mergeExtractedUnits(extractedByImage); const score = completenessScore(deduped); const previous = await getLatestSnapshot(); const old = previous ? await getUnitsForSnapshot(previous.id) : []; const changes = compareUnits(deduped, old); const failedFiles = coverage.filter(c => c.status === "failed"); const warnings = [incompleteUploadWarning(old.length, deduped.length, score), failedFiles.length ? `${failedFiles.length} screenshot${failedFiles.length === 1 ? " was" : "s were"} not readable by OCR. Review those files and retry.` : null].filter(Boolean); const warning = warnings.length ? warnings.join(" ") : null;
    return { assets: assets.map(a => ({ name: a.name, mimeType: a.mimeType, key: a.key, url: a.url })), units: deduped, processedImageCount: assets.length, extractedRowCount: extractedByImage.reduce((n, rows) => n + rows.length, 0), coverage, changes, completenessScore: score, warning, previousSnapshotDate: previous?.snapshotDate ?? null };
  }),
  resetInventory: adminProcedure.input(z.object({ password: z.string().min(1) })).mutation(async ({ input }) => { if (!validateInventoryResetPassword(input.password)) throw new Error("Incorrect reset password"); return resetInventoryData(); }),
  confirm: protectedProcedure.input(z.object({ snapshotDate: z.string(), sourceFileCount: z.number(), completenessScore: z.number(), warning: z.string().nullable(), assets: z.array(z.object({ name: z.string(), mimeType: z.string(), key: z.string(), url: z.string() })), units: z.array(z.object({ societyName: z.string(), unitNumber: z.string(), areaSqft: z.number().nullable(), configuration: z.string().nullable(), floor: z.string().nullable(), locality: z.string().nullable(), status: z.string().nullable(), askPriceDisplay: z.string().nullable(), askPriceValue: z.number().nullable(), isMarkedNew: z.boolean() })), changes: z.array(z.object({ type: z.string(), unit: z.any(), before: z.any().optional() })) })).mutation(async ({ input }) => {
    const db = await getDb(); if (!db) throw new Error("Database unavailable"); const now = new Date(input.snapshotDate); const snapshot = await db.insert(inventorySnapshots).values({ snapshotDate: now, unitCount: input.units.length, sourceFileCount: input.sourceFileCount, completenessScore: String(input.completenessScore), warningMessage: input.warning }).$returningId(); const snapshotId = snapshot[0]!.id;
    for (const a of input.assets) await db.insert(snapshotAssets).values({ snapshotId, fileName: a.name, mimeType: a.mimeType, storageKey: a.key, storageUrl: a.url });
    for (const u of input.units) await db.insert(inventoryUnits).values({ snapshotId, unitKey: unitKey(u), societyName: u.societyName, unitNumber: u.unitNumber, areaSqft: u.areaSqft == null ? null : String(u.areaSqft), configuration: u.configuration, floor: u.floor, locality: u.locality, status: u.status, askPriceDisplay: u.askPriceDisplay, askPriceValue: u.askPriceValue == null ? null : String(u.askPriceValue), isMarkedNew: u.isMarkedNew, firstSourcedAt: now, lastSeenAt: now, active: true });
    for (const c of input.changes) await db.insert(changeEvents).values({ snapshotId, unitKey: unitKey(c.unit), eventType: c.type === "potentially_sold" ? "sold" : c.type as any, beforeJson: c.before ? JSON.stringify(c.before) : JSON.stringify(c.unit), afterJson: c.type === "potentially_sold" ? null : JSON.stringify(c.unit) });
    return { snapshotId };
  }),
});
export type AppRouter = typeof appRouter;
