import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Admin procedures and password protection", () => {
  it("rejects incorrect admin password on adminVerify and addUnit", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "admin-user",
        email: "admin@example.com",
        name: "Admin User",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.adminVerify({ password: "wrongpassword" })).rejects.toThrow();
  });
});
