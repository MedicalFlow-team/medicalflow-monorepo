import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { hash, verify as verifyHash } from "argon2";
import type { PrismaClient } from "../../generated/prisma/client";
import { ApiError } from "../../lib/api-error";
import {
  safeSessionIpAddress,
  summarizeUserAgent,
} from "../../lib/session-metadata";
import { InvalidCurrentPassword, UserNotFound } from "./errors";
import type {
  ChangePasswordBody,
  ChangePasswordResponse,
  ProfileResponse,
  SessionsResponse,
  UpdateProfileBody,
} from "./model";

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export interface ProfilePhotoStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  downloadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

export function createProfilePhotoStore(config: {
  endpoint: string | null;
  bucket: string | null;
  region: string;
  accessKeyId: string | null;
  secretAccessKey: string | null;
}): ProfilePhotoStore | null {
  if (
    !config.endpoint ||
    !config.bucket ||
    !config.accessKeyId ||
    !config.secretAccessKey
  )
    return null;
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const bucket = config.bucket;
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async downloadUrl(key) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: 900 },
      );
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

function detectedImageType(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | null {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  )
    return "image/jpeg";
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a &&
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52
  )
    return "image/png";
  return null;
}

export interface AccountDeps {
  prisma: PrismaClient;
  photoStore?: ProfilePhotoStore | null;
}

export class AccountService {
  constructor(private readonly deps: AccountDeps) {}

  /**
   * Altera a senha do usuário após validar a senha atual via Argon2id.
   * Não altera nada no banco se a senha atual for incorreta.
   * Revoga as outras sessões na mesma transação da troca de senha (#192).
   * A sessão atual permanece ativa; revogação manual é tratada na #333.
   */
  async changePassword(
    userId: string,
    currentSessionId: string,
    body: ChangePasswordBody,
  ): Promise<ChangePasswordResponse> {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw UserNotFound();
    }

    const isMatch = await verifyHash(user.passwordHash, body.currentPassword);
    if (!isMatch) {
      throw InvalidCurrentPassword();
    }

    const newHash = await hash(body.newPassword);
    await this.deps.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });
      await tx.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: "Senha alterada com sucesso." };
  }

  /**
   * Lista apenas sessões ativas da própria conta (revokedAt = null e expiresAt > agora).
   * Identifica a sessão atual comparando session.id com currentSessionId.
   */
  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionsResponse> {
    const sessions = await this.deps.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastActiveAt: true,
      },
      orderBy: { lastActiveAt: "desc" },
    });

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        isCurrent: s.id === currentSessionId,
        ipAddress: safeSessionIpAddress(s.ipAddress),
        userAgent: summarizeUserAgent(s.userAgent),
        lastActiveAt: s.lastActiveAt.toISOString(),
      })),
    };
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        profilePhotoContentType: true,
        profilePhotoSizeBytes: true,
      },
    });
    if (!user) {
      throw UserNotFound();
    }
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      photo:
        user.profilePhotoContentType && user.profilePhotoSizeBytes
          ? {
              contentType: user.profilePhotoContentType,
              sizeBytes: user.profilePhotoSizeBytes,
            }
          : null,
    };
  }

  async updateProfile(
    userId: string,
    body: UpdateProfileBody,
  ): Promise<ProfileResponse> {
    const fullName = body.fullName.trim();
    if (fullName.length < 3)
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Nome deve ter pelo menos 3 caracteres.",
      );
    const updated = await this.deps.prisma.user.updateMany({
      where: { id: userId },
      data: { fullName },
    });
    if (updated.count === 0) throw UserNotFound();
    return this.getProfile(userId);
  }

  async uploadPhoto(userId: string, file: File): Promise<ProfileResponse> {
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      throw new ApiError(
        "FILE_TOO_LARGE",
        413,
        "Foto deve ter no máximo 5 MiB.",
      );
    }
    if (file.size === 0) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Foto deve ser JPEG ou PNG válido.",
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = detectedImageType(bytes);
    if (!contentType || contentType !== file.type) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Foto deve ser JPEG ou PNG válido.",
      );
    }
    const store = this.deps.photoStore;
    if (!store)
      throw new ApiError(
        "STORAGE_UNAVAILABLE",
        503,
        "Armazenamento indisponível.",
      );
    const existing = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoKey: true },
    });
    if (!existing) throw UserNotFound();
    const key = `users/${userId}/profile/${crypto.randomUUID()}`;
    await store.put(key, bytes, contentType);
    try {
      await this.deps.prisma.user.update({
        where: { id: userId },
        data: {
          profilePhotoKey: key,
          profilePhotoContentType: contentType,
          profilePhotoSizeBytes: bytes.length,
        },
      });
    } catch (error) {
      await store.delete(key).catch(() => {});
      throw error;
    }
    if (existing.profilePhotoKey)
      await store.delete(existing.profilePhotoKey).catch(() => {});
    return this.getProfile(userId);
  }

  async getPhotoUrl(
    userId: string,
  ): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoKey: true },
    });
    if (!user) throw UserNotFound();
    if (!user.profilePhotoKey)
      throw new ApiError("NOT_FOUND", 404, "Foto não encontrada.");
    const store = this.deps.photoStore;
    if (!store)
      throw new ApiError(
        "STORAGE_UNAVAILABLE",
        503,
        "Armazenamento indisponível.",
      );
    return {
      downloadUrl: await store.downloadUrl(user.profilePhotoKey),
      expiresInSeconds: 900,
    };
  }
}
