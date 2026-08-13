import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerBlobUpload } from "./blobUpload";
import { appRouter } from "../routers";
import { createContext } from "./context";

// Builds the Express app with no side effects (no listen(), no static/Vite
// wiring) so it can be reused by both the long-running Railway/local server
// (server/_core/index.ts) and the Vercel serverless entrypoint (api/index.ts),
// which serves the built client separately via Vercel's static hosting.
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerBlobUpload(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
