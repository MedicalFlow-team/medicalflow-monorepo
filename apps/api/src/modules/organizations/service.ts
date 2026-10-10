import type { PrismaClient } from "../../generated/prisma/client";
import { ApiError } from "../../lib/api-error";
import type { ClinicDetailsBody } from "./model";

function validCnpj(value: string) {
  if (!value) return true;
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const digit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder =
      weights.reduce(
        (sum, weight, index) => sum + Number(value[index]) * weight,
        0,
      ) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return Number(value[12]) === digit(12) && Number(value[13]) === digit(13);
}

export class OrganizationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      data: memberships.map(({ role, organization }) => ({
        ...organization,
        role,
      })),
    };
  }

  private async editableClinic(userId: string, slug: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        role: "ADMIN",
        organization: { slug },
      },
      select: { organization: true },
    });
    if (!membership)
      throw new ApiError("NOT_FOUND", 404, "Clínica não encontrada.");
    return membership.organization;
  }

  async getClinicDetails(userId: string, slug: string) {
    const org = await this.editableClinic(userId, slug);
    return {
      name: org.name,
      slug: org.slug,
      version: org.detailsVersion,
      completed: org.detailsCompletedAt !== null,
      legalName: org.legalName ?? "",
      taxId: org.taxId ?? "",
      contactEmail: org.contactEmail ?? "",
      contactPhone: org.contactPhone ?? "",
      postalCode: org.postalCode ?? "",
      state: org.state ?? "",
      city: org.city ?? "",
      district: org.district ?? "",
      street: org.street ?? "",
      streetNumber: org.streetNumber ?? "",
      addressComplement: org.addressComplement ?? "",
    };
  }

  async saveClinicDetails(
    userId: string,
    slug: string,
    body: ClinicDetailsBody,
  ) {
    const org = await this.editableClinic(userId, slug);
    const savedProgress = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });
    const draft = savedProgress?.draftData;
    if (
      draft &&
      typeof draft === "object" &&
      !Array.isArray(draft) &&
      "organizationId" in draft &&
      draft.organizationId !== org.id
    ) {
      throw new ApiError("NOT_FOUND", 404, "Clínica não encontrada.");
    }
    const taxId = body.taxId.replace(/\D/g, "");
    const phone = body.contactPhone.replace(/\D/g, "");
    if (
      !validCnpj(taxId) ||
      phone.length < 10 ||
      phone.length > 13 ||
      ![body.legalName, body.city, body.district, body.street].every(
        (value) => value.trim().length >= 2,
      ) ||
      !body.streetNumber.trim() ||
      !/^\d{8}$/.test(body.postalCode)
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Confira os dados da clínica e o endereço.",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const stillAdmin = await tx.membership.findFirst({
        where: {
          userId,
          organizationId: org.id,
          role: "ADMIN",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!stillAdmin)
        throw new ApiError("NOT_FOUND", 404, "Clínica não encontrada.");
      const updated = await tx.organization.updateMany({
        where: { id: org.id, detailsVersion: body.version },
        data: {
          legalName: body.legalName.trim(),
          taxId: taxId || null,
          contactEmail: body.contactEmail.trim().toLowerCase(),
          contactPhone: phone,
          postalCode: body.postalCode,
          state: body.state.toUpperCase(),
          city: body.city.trim(),
          district: body.district.trim(),
          street: body.street.trim(),
          streetNumber: body.streetNumber.trim(),
          addressComplement: body.addressComplement.trim() || null,
          detailsVersion: { increment: 1 },
          detailsCompletedAt: new Date(),
        },
      });
      if (!updated.count)
        throw new ApiError(
          "CONFLICT",
          409,
          "A clínica foi alterada em outra sessão. Recarregue os dados.",
        );
      if (
        savedProgress &&
        ["ORGANIZATION_SETUP", "CLINIC_DETAILS"].includes(
          savedProgress.currentStep,
        )
      ) {
        await tx.onboardingProgress.update({
          where: { userId },
          data: {
            currentStep: "CLINIC_DETAILS",
            completed: true,
            version: { increment: 1 },
          },
        });
      }
    });
    return this.getClinicDetails(userId, slug);
  }
}
