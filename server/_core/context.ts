import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Self-hosted deployments have no login: every visitor is auto-signed-in as
// this single admin user. Destructive/admin actions still require the
// separate INVENTORY_RESET_PASSWORD confirmation (see adminProcedure and
// validateInventoryResetPassword in routers.ts), so the app stays open to
// browse and upload while admin actions stay gated.
const LOCAL_ADMIN_OPEN_ID = "local-admin";

async function getOrCreateLocalAdmin(): Promise<User | null> {
  let user = await getUserByOpenId(LOCAL_ADMIN_OPEN_ID);
  if (!user) {
    await upsertUser({ openId: LOCAL_ADMIN_OPEN_ID, name: "Admin", role: "admin", lastSignedIn: new Date() });
    user = await getUserByOpenId(LOCAL_ADMIN_OPEN_ID);
  }
  return user ?? null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await getOrCreateLocalAdmin();

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
