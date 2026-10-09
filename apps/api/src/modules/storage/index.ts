import { Elysia, t } from "elysia";
import type { PrismaClient } from "../../generated/prisma/client";
import { authPlugin } from "../../plugins/auth";
import * as m from "./model";
import { StorageService } from "./service";

export function storageModule(deps: {
  prisma: PrismaClient;
  jwtSecret: string;
  config: {
    endpoint: string | null;
    bucket: string | null;
    region: string;
    accessKeyId: string | null;
    secretAccessKey: string | null;
  };
}) {
  const service = new StorageService({
    prisma: deps.prisma,
    config: deps.config,
  });
  return new Elysia({ name: "storage" })
    .use(authPlugin({ prisma: deps.prisma, jwtSecret: deps.jwtSecret }))
    .group("/organizations/:orgSlug/storage", (group) =>
      group
        .post(
          "/upload-url",
          ({ auth, params, body }) =>
            service.createUpload(auth.userId, params.orgSlug, body),
          {
            params: t.Object({ orgSlug: t.String() }),
            body: m.uploadBody,
            response: { 200: m.storageResponse },
          },
        )
        .post(
          "/:objectId/download-url",
          ({ auth, params }) =>
            service.createDownload(
              auth.userId,
              params.orgSlug,
              params.objectId,
            ),
          {
            params: t.Object({ orgSlug: t.String(), objectId: t.String() }),
            response: { 200: m.downloadResponse },
          },
        ),
    );
}
