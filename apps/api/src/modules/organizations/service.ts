import type { PrismaClient } from "../../generated/prisma/client";
import type { OrganizationsResponse } from "./model";

export interface OrganizationsDeps {
  prisma: PrismaClient;
  jwtSecret: string;
}

// #227 permite consulta limitada; preserva o envelope { data } do contrato.
const ORGANIZATIONS_LIMIT = 100;

export class OrganizationsService {
  constructor(private readonly deps: Pick<OrganizationsDeps, "prisma">) {}

  async list(userId: string): Promise<OrganizationsResponse> {
    const memberships = await this.deps.prisma.membership.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      // Slug único garante ordem estável sem depender da ordem de inserção.
      orderBy: { organization: { slug: "asc" } },
      take: ORGANIZATIONS_LIMIT,
    });

    return {
      data: memberships.map(({ role, organization }) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role,
        active: true,
      })),
    };
  }
}
