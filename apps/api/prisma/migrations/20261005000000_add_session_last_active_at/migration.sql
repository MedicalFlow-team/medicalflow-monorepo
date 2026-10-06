-- AlterTable
ALTER TABLE "Session" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

UPDATE "Session"
SET "lastActiveAt" = "createdAt";

ALTER TABLE "Session"
ALTER COLUMN "lastActiveAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "lastActiveAt" SET NOT NULL;
