import type { PrismaClient } from "../../generated/prisma/client";
import { ApiError } from "../../lib/api-error";
import { slugify } from "../../lib/slug";
import { Unauthenticated } from "../auth/errors";
import type { CreateOrganizationBody } from "./model";

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
    const progress = await this.deps.prisma.onboardingProgress.findUnique({
      where: { userId },
    });
    if (!progress) {
      return {
        currentStep: "ORGANIZATION_SETUP",
        completed: false,
        draftData: {},
        version: 0,
      };
    }
    return {
      currentStep: progress.currentStep,
      completed: progress.completed,
      draftData: progress.draftData as Record<string, unknown>,
      version: progress.version,
    };
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
}
