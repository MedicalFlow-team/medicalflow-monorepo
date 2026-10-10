import type { PrismaClient } from "../../generated/prisma/client";
import { ApiError } from "../../lib/api-error";
import type { ClinicAddressBody, ClinicContactBody } from "./model";

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
      take: 100,
    });

    return {
      data: memberships.map(({ role, organization }) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role,
        status: "ACTIVE" as const,
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

  async saveClinicContact(
    userId: string,
    slug: string,
    body: ClinicContactBody,
  ) {
    return this.saveClinicStep(userId, slug, "CLINIC_DETAILS", body);
  }

  async saveClinicAddress(
    userId: string,
    slug: string,
    body: ClinicAddressBody,
  ) {
    return this.saveClinicStep(userId, slug, "CLINIC_ADDRESS", body);
  }

  private async saveClinicStep(
    userId: string,
    slug: string,
    step: "CLINIC_DETAILS" | "CLINIC_ADDRESS",
    body: ClinicContactBody | ClinicAddressBody,
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
    const canSave = (
      progress: { currentStep: string; completed: boolean } | null,
    ) =>
      !!progress &&
      (step === "CLINIC_DETAILS"
        ? (progress.currentStep === "ORGANIZATION_SETUP" &&
            progress.completed) ||
          (progress.currentStep === "CLINIC_DETAILS" && !progress.completed)
        : progress.currentStep === "CLINIC_DETAILS" && progress.completed);
    if (!canSave(savedProgress)) {
      throw new ApiError(
        "STEP_ALREADY_COMPLETED",
        409,
        "Esta etapa não está disponível.",
      );
    }
    const contact =
      step === "CLINIC_DETAILS" ? (body as ClinicContactBody) : null;
    const address =
      step === "CLINIC_ADDRESS" ? (body as ClinicAddressBody) : null;
    const taxId = contact?.taxId.replace(/\D/g, "") ?? "";
    const phone = contact?.contactPhone.replace(/\D/g, "") ?? "";
    if (
      contact
        ? !validCnpj(taxId) ||
          phone.length < 10 ||
          phone.length > 13 ||
          contact.legalName.trim().length < 2
        : !address ||
          ![address.city, address.district, address.street].every(
            (value) => value.trim().length >= 2,
          ) ||
          !address.streetNumber.trim() ||
          !/^\d{8}$/.test(address.postalCode)
    ) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Confira os dados da clínica e o endereço.",
      );
    }
    const stepData = contact
      ? {
          legalName: contact.legalName.trim(),
          taxId: taxId || null,
          contactEmail: contact.contactEmail.trim().toLowerCase(),
          contactPhone: phone,
        }
      : {
          postalCode: address?.postalCode,
          state: address?.state.toUpperCase(),
          city: address?.city.trim(),
          district: address?.district.trim(),
          street: address?.street.trim(),
          streetNumber: address?.streetNumber.trim(),
          addressComplement: address?.addressComplement.trim() || null,
          detailsCompletedAt: new Date(),
        };
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
      const currentProgress = await tx.onboardingProgress.findUnique({
        where: { userId },
      });
      if (!canSave(currentProgress)) {
        throw new ApiError(
          "STEP_ALREADY_COMPLETED",
          409,
          "Esta etapa não está disponível.",
        );
      }
      const updated = await tx.organization.updateMany({
        where: { id: org.id, detailsVersion: body.version },
        data: {
          ...stepData,
          detailsVersion: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new ApiError(
          "CONFLICT",
          409,
          "A clínica foi alterada em outra sessão. Recarregue os dados.",
        );
      await tx.onboardingProgress.update({
        where: { userId },
        data: { currentStep: step, completed: true, version: { increment: 1 } },
      });
    });
    return this.getClinicDetails(userId, slug);
  }
}
