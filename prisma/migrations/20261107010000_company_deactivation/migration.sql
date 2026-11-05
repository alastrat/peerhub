-- Super admins can deactivate a company. Additive only.
ALTER TABLE "Company"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deactivatedAt" TIMESTAMP(3);
