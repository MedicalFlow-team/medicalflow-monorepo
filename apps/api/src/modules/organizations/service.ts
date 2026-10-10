import type { PrismaClient } from "../../generated/prisma/client";

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
}
