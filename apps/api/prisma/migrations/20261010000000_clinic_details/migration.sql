ALTER TABLE "Organization"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "taxId" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "district" TEXT,
  ADD COLUMN "street" TEXT,
  ADD COLUMN "streetNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "detailsVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "detailsCompletedAt" TIMESTAMP(3);
