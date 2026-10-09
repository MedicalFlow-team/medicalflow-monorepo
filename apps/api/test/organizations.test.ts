import { expect, test } from "bun:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { OrganizationsService } from "../src/modules/organizations/service";

test("lists only active memberships for the authenticated user", async () => {
  let query: unknown;
  const prisma = {
    membership: {
      findMany: async (args: unknown) => {
        query = args;
        return [
          {
            role: "ADMIN",
            organization: {
              id: "org-1",
              name: "Pet Saúde",
              slug: "pet-saude",
            },
          },
        ];
      },
    },
  } as unknown as PrismaClient;

  const result = await new OrganizationsService(prisma).listForUser("user-1");

  expect(query).toMatchObject({
    where: { userId: "user-1", status: "ACTIVE" },
  });
  expect(result).toEqual({
    data: [
      {
        id: "org-1",
        name: "Pet Saúde",
        slug: "pet-saude",
        role: "ADMIN",
      },
    ],
  });
});
