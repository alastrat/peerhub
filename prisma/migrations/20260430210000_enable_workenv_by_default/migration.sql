-- Flip default for new companies and backfill existing ones.
ALTER TABLE "Company" ALTER COLUMN "featureWorkEnv" SET DEFAULT true;
UPDATE "Company" SET "featureWorkEnv" = true WHERE "featureWorkEnv" = false;
