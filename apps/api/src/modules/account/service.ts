import { hash, verify as verifyHash } from "argon2";
import { fileType } from "elysia";
import type { PrismaClient } from "../../generated/prisma/client";
import {
  safeSessionIpAddress,
  summarizeUserAgent,
} from "../../lib/session-metadata";
import {
  PROFILE_PHOTO_URL_TTL_SECONDS,
  type ProfilePhotoStore,
} from "../../services/profile-photo-store";
import {
  InvalidCurrentPassword,
  ProfilePhotoNotFound,
  StorageUnavailable,
  UserNotFound,
} from "./errors";
import type {
  ChangePasswordBody,
  ChangePasswordResponse,
  ProfilePhotoUrlResponse,
  ProfileResponse,
  SessionsResponse,
  UpdateProfileBody,
} from "./model";

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
    const updated = await this.deps.prisma.user.updateMany({
      where: { id: userId },
      data: { fullName },
    });
    if (updated.count === 0) throw UserNotFound();
    return this.getProfile(userId);
  }

  async uploadPhoto(userId: string, file: File): Promise<ProfileResponse> {
    await fileType(file, file.type);
    const store = this.deps.photoStore;
    if (!store) throw StorageUnavailable();
    const existing = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoKey: true },
    });
    if (!existing) throw UserNotFound();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const key = `users/${userId}/profile/${crypto.randomUUID()}`;
    await store.put(key, bytes, file.type);
    try {
      await this.deps.prisma.user.update({
        where: { id: userId },
        data: {
          profilePhotoKey: key,
          profilePhotoContentType: file.type,
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

  async getPhotoUrl(userId: string): Promise<ProfilePhotoUrlResponse> {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoKey: true },
    });
    if (!user) throw UserNotFound();
    if (!user.profilePhotoKey) throw ProfilePhotoNotFound();
    const store = this.deps.photoStore;
    if (!store) throw StorageUnavailable();
    return {
      downloadUrl: await store.downloadUrl(user.profilePhotoKey),
      expiresInSeconds: PROFILE_PHOTO_URL_TTL_SECONDS,
    };
  }
}
