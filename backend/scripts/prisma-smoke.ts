import { prisma } from "../src/db/prisma";

let probeId: number | undefined;

try {
  await prisma.$connect();

  const created = await prisma.infrastructureProbe.create({
    data: {},
  });
  probeId = created.id;

  const found = await prisma.infrastructureProbe.findUnique({
    where: { id: created.id },
  });

  if (!found) {
    throw new Error("Prisma smoke test could not read the probe.");
  }

  console.log("Prisma PostgreSQL smoke test passed.");
} finally {
  if (probeId !== undefined) {
    await prisma.infrastructureProbe.deleteMany({
      where: { id: probeId },
    });
  }

  await prisma.$disconnect();
}