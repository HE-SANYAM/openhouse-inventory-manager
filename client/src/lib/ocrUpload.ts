export const supportedUploadMimes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type SupportedUploadMime = (typeof supportedUploadMimes)[number];

export const isSupportedUploadMime = (mimeType: string): mimeType is SupportedUploadMime =>
  supportedUploadMimes.includes(mimeType as SupportedUploadMime);

export const uploadAcceptAttribute = supportedUploadMimes.join(",");
