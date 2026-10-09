import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadEnv } from "../config/env";
import { createPrismaClient } from "../services/db";

const RETENTION_DAYS = 30;
const BATCH_SIZE = 100;

async function main() {
  const env = loadEnv();
  if (
    !env.storageEndpoint ||
    !env.storageBucket ||
    !env.storageAccessKeyId ||
    !env.storageSecretAccessKey
  ) {
    throw new Error("STORAGE_* configuration is required for audio expiry");
  }

  const apply = process.argv.includes("--apply");
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const prisma = createPrismaClient(env.databaseUrl);
  const client = new S3Client({
    endpoint: env.storageEndpoint,
    region: env.storageRegion ?? "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.storageAccessKeyId,
      secretAccessKey: env.storageSecretAccessKey,
    },
  });

  let examined = 0;
  let deleted = 0;
  let cursor: string | undefined;
  try {
    while (true) {
      const objects = await prisma.storageObject.findMany({
        where: {
          category: "audio",
          createdAt: { lt: cutoff },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
      });
      if (objects.length === 0) break;
      for (const object of objects) {
        examined++;
        const expectedPrefix = `organizations/${object.organizationId}/audio/`;
        if (!object.objectKey.startsWith(expectedPrefix)) {
          throw new Error("Unexpected audio object key prefix; expiry stopped");
        }
        if (apply) {
          await client.send(
            new DeleteObjectCommand({
              Bucket: env.storageBucket,
              Key: object.objectKey,
            }),
          );
          await prisma.storageObject.delete({ where: { id: object.id } });
          deleted++;
        }
        cursor = object.id;
      }
      if (objects.length < BATCH_SIZE) break;
    }
    console.log(
      JSON.stringify({
        job: "expire-audio",
        mode: apply ? "apply" : "dry-run",
        cutoff: cutoff.toISOString(),
        examined,
        deleted,
      }),
    );
  } finally {
    client.destroy();
    await prisma.$disconnect();
  }
}

await main();
