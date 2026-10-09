import { describe, expect, test } from "bun:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { ApiError } from "../src/lib/api-error";
import { StorageService } from "../src/modules/storage/service";

const orgId = "11111111-1111-4111-8111-111111111111";
const otherOrgId = "22222222-2222-4222-8222-222222222222";

function setup(active = true) {
  const records: Array<{
    id: string;
    organizationId: string;
    objectKey: string;
  }> = [];
  const prisma = {
    membership: {
      findFirst: async ({
        where,
      }: {
        where: { userId: string; organization: { slug: string } };
      }) =>
        active &&
        where.userId === "user-a" &&
        where.organization.slug === "clinic-a"
          ? { organizationId: orgId }
          : null,
    },
    storageObject: {
      create: async ({
        data,
      }: {
        data: { organizationId: string; objectKey: string };
      }) => {
        const record = { id: crypto.randomUUID(), ...data };
        records.push(record);
        return record;
      },
      findFirst: async ({
        where,
      }: {
        where: { id: string; organizationId: string };
      }) =>
        records.find(
          (record) =>
            record.id === where.id &&
            record.organizationId === where.organizationId,
        ) ?? null,
    },
  } as unknown as PrismaClient;
  const service = new StorageService({
    prisma,
    config: {
      endpoint: "https://example.invalid",
      bucket: "test-private-bucket",
      region: "auto",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
    },
  });
  return { service, records };
}

const upload = {
  fileName: "sample.webm",
  contentType: "audio/webm",
  sizeBytes: 1024,
  category: "audio" as const,
};

describe("private storage", () => {
  test("signs only allowed category and organization with bounded expiry", async () => {
    const { service } = setup();
    const result = await service.createUpload("user-a", "clinic-a", upload);
    expect(result.objectKey.startsWith(`organizations/audio/${orgId}/`)).toBe(
      true,
    );
    expect(result.expiresInSeconds).toBe(600);
    expect(new URL(result.uploadUrl).searchParams.get("X-Amz-Expires")).toBe(
      "600",
    );
    const download = await service.createDownload(
      "user-a",
      "clinic-a",
      result.objectId,
    );
    expect(download.expiresInSeconds).toBe(900);
    expect(
      new URL(download.downloadUrl).searchParams.get("X-Amz-Expires"),
    ).toBe("900");
  });

  test("rejects users without active membership before issuing a URL", async () => {
    const { service, records } = setup(false);
    await expect(
      service.createUpload("user-a", "clinic-a", upload),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      httpStatus: 403,
    } satisfies Partial<ApiError>);
    expect(records).toHaveLength(0);
  });

  test("cannot sign a download for another organization", async () => {
    const { service, records } = setup();
    records.push({
      id: "other-object",
      organizationId: otherOrgId,
      objectKey: `organizations/audio/${otherOrgId}/sample`,
    });
    await expect(
      service.createDownload("user-a", "clinic-a", "other-object"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      httpStatus: 404,
    } satisfies Partial<ApiError>);
  });

  test("rejects MIME mismatches and oversized files before persistence", async () => {
    const { service, records } = setup();
    await expect(
      service.createUpload("user-a", "clinic-a", {
        ...upload,
        contentType: "application/pdf",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.createUpload("user-a", "clinic-a", {
        ...upload,
        contentType: "application/octet-stream",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      service.createUpload("user-a", "clinic-a", {
        ...upload,
        sizeBytes: 50 * 1024 * 1024 + 1,
      }),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE", httpStatus: 413 });
    expect(records).toHaveLength(0);
  });
});
