import type { PrismaClient } from "../../generated/prisma/client";
import { ApiError } from "../../lib/api-error";
import { slugify } from "../../lib/slug";
import { Unauthenticated } from "../auth/errors";
import type {
  CreateOrganizationBody,
  ProfileBody,
  ProfileDraftBody,
  SlugAvailabilityResponse,
} from "./model";

/**
 * Dependências do módulo (controller): prisma + secret para o authPlugin.
 */
export interface OnboardingDeps {
  prisma: PrismaClient;
  jwtSecret: string;
}

/**
 * Regras de negócio do onboarding (#215/#216).
 * Service puro: sem Context, sem HTTP — só dependências injetadas.
 */
export class OnboardingService {
  constructor(private readonly deps: { prisma: PrismaClient }) {}

  /** #215 — progresso da própria conta; 404 sem registro é estado "novo". */
  async getProgress(userId: string) {
    const [progress, user] = await Promise.all([
      this.deps.prisma.onboardingProgress.findUnique({ where: { userId } }),
      this.deps.prisma.user.findUnique({
        where: { id: userId },
        select: { profileCompletedAt: true },
      }),
    ]);
    if (!user) throw Unauthenticated();
    if (!progress) {
      return {
        currentStep: user.profileCompletedAt
          ? "ORGANIZATION_SETUP"
          : "PROFILE_SETUP",
        completed: false,
        draftData: {},
        version: 0,
      };
    }
    return {
      currentStep: user.profileCompletedAt
        ? progress.currentStep
        : "PROFILE_SETUP",
      completed: progress.completed,
      draftData: progress.draftData as Record<string, unknown>,
      version: progress.version,
    };
  }

  async getProfile(userId: string) {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
      include: { onboarding: true },
    });
    if (!user) throw Unauthenticated();
    const savedDraft = user.onboarding?.draftData;
    const draft =
      savedDraft && typeof savedDraft === "object" && !Array.isArray(savedDraft)
        ? (savedDraft as Record<string, unknown>).profile
        : null;
    const profileDraft =
      draft && typeof draft === "object" && !Array.isArray(draft)
        ? (draft as Record<string, unknown>)
        : null;
    const field = (name: keyof ProfileDraftBody, fallback: string | null) =>
      !user.profileCompletedAt && typeof profileDraft?.[name] === "string"
        ? (profileDraft[name] as string)
        : fallback;
    return {
      fullName: field("fullName", user.fullName) ?? user.fullName,
      phone: field("phone", user.phone),
      professionalRole: field("professionalRole", user.professionalRole),
      professionalTitle: field("professionalTitle", user.professionalTitle),
      registrationNumber: field("registrationNumber", user.registrationNumber),
      completed: user.profileCompletedAt !== null,
    };
  }

  async saveProfileDraft(userId: string, body: ProfileDraftBody) {
    await this.deps.prisma.onboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        currentStep: "PROFILE_SETUP",
        draftData: { profile: body },
        version: 1,
      },
      update: {
        draftData: { profile: body },
        version: { increment: 1 },
      },
    });
    return this.getProfile(userId);
  }

  async saveProfile(userId: string, body: ProfileBody) {
    const fullName = body.fullName.trim();
    const phone = body.phone.replace(/\D/g, "");
    const professionalTitle = body.professionalTitle?.trim() || null;
    const registrationNumber = body.registrationNumber?.trim() || null;
    if (fullName.length < 3 || phone.length < 10 || phone.length > 13) {
      throw new ApiError("VALIDATION_ERROR", 400, "Nome ou telefone inválido.");
    }
    if (
      body.professionalRole === "CLINICAL" &&
      (!professionalTitle || !registrationNumber)
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Informe a profissão e o registro profissional.",
      );
    }

    await this.deps.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          fullName,
          phone,
          professionalRole: body.professionalRole,
          professionalTitle:
            body.professionalRole === "CLINICAL" ? professionalTitle : null,
          registrationNumber:
            body.professionalRole === "CLINICAL" ? registrationNumber : null,
          profileCompletedAt: new Date(),
        },
      });
      await tx.onboardingProgress.upsert({
        where: { userId },
        create: { userId, currentStep: "ORGANIZATION_SETUP", version: 1 },
        update: {
          currentStep: "ORGANIZATION_SETUP",
          draftData: {},
          version: { increment: 1 },
        },
      });
    });
    return this.getProfile(userId);
  }

  /**
   * #216 — cria clínica + Membership ADMIN do criador numa transação única:
   * falha em qualquer parte não deixa clínica órfã.
   * Slug normalizado; colisão devolve erro de campo (ALREADY_EXISTS).
   * Repetição com o mesmo slug não cria segunda clínica.
   */
  async createOrganization(userId: string, body: CreateOrganizationBody) {
    const user = await this.deps.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw Unauthenticated();

    const slug = slugify(body.slug ?? body.name);
    if (!slug) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Slug inválido: informe um nome com letras ou números.",
      );
    }

    const existing = await this.deps.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ApiError(
        "ALREADY_EXISTS",
        409,
        "Este slug já está em uso. Escolha outro.",
      );
    }

    const organization = await this.deps.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: body.name.trim(), slug, ownerId: userId },
      });
      const membership = await tx.membership.create({
        data: {
          userId,
          organizationId: org.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
      // Cada clínica criada exige assinatura do dono (R$ 89/mês).
      // Cobrança é task futura; aqui apenas registramos o estado.
      const subscription = await tx.subscription.create({
        data: { organizationId: org.id },
      });
      await tx.onboardingProgress.upsert({
        where: { userId },
        create: { userId, currentStep: "ORGANIZATION_SETUP", completed: false },
        update: {},
      });
      return { org, membership, subscription };
    });

    return {
      organization: {
        id: organization.org.id,
        name: organization.org.name,
        slug: organization.org.slug,
        role: organization.membership.role,
        isOwner: true,
      },
    };
  }

  async checkSlugAvailability(
    rawSlug: string,
  ): Promise<SlugAvailabilityResponse> {
    const slug = slugify(rawSlug);
    if (!slug) {
      return { available: false, slug: "" };
    }
    const existing = await this.deps.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    return { available: !existing, slug };
  }
}
