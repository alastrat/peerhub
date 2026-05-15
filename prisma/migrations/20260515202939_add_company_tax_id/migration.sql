-- Add the taxId column to Company. Existing rows are backfilled with the
-- "PENDING" sentinel so the legacy data continues to satisfy the NOT NULL
-- constraint; the application-side validation (Zod) blocks empty / sentinel
-- values on any new insert.
--
-- The schema in prisma/schema.prisma intentionally declares no default, so
-- the Prisma client forces callers to supply a real value at the type
-- level. We add a default here only to make the backfill clean, then drop
-- the default so the database state matches the schema.
ALTER TABLE "Company" ADD COLUMN "taxId" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Company" ALTER COLUMN "taxId" DROP DEFAULT;
