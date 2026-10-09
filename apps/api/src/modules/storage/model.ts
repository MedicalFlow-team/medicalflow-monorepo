import { t } from "elysia";

export const uploadBody = t.Object({
  fileName: t.String({ minLength: 1, maxLength: 255 }),
  contentType: t.String({ minLength: 1, maxLength: 100 }),
  sizeBytes: t.Integer({ minimum: 1 }),
  category: t.Union([t.Literal("audio"), t.Literal("attachment"), t.Literal("pdf")]),
});

export const storageResponse = t.Object({
  objectId: t.String(),
  objectKey: t.String(),
  uploadUrl: t.String(),
  expiresInSeconds: t.Integer(),
});

export const downloadResponse = t.Object({
  objectId: t.String(),
  downloadUrl: t.String(),
  expiresInSeconds: t.Integer(),
});

export type UploadBody = typeof uploadBody.static;
