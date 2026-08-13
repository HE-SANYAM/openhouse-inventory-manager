import type { Express } from "express";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Client-side direct-to-Blob uploads (client/src/pages/Home.tsx) need this
// token-exchange route: it authorizes the upload and hands back a short-lived
// client token, so large screenshots/PDFs never pass through our own
// request body (avoiding Vercel's 4.5MB function payload limit).
export function registerBlobUpload(app: Express) {
  app.post("/api/blob-upload", async (req, res) => {
    const body = req.body as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"],
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => {},
      });
      res.status(200).json(jsonResponse);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Upload failed" });
    }
  });
}
