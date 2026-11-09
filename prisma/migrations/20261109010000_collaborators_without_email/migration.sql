-- Collaborators without a corporate email answer surveys from a personal,
-- single-use link shared by WhatsApp. Additive only.

-- People without an email; the unique (companyId, email) index allows many NULLs
ALTER TABLE "Employee" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Employee" ADD COLUMN "phone" TEXT;

-- A personal survey link: signs the person into the portal once
ALTER TYPE "AccessTokenPurpose" ADD VALUE IF NOT EXISTS 'SURVEY_LINK';

ALTER TABLE "AccessToken" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "AccessToken" ADD COLUMN "distributionId" TEXT;

CREATE INDEX "AccessToken_distributionId_employeeId_idx" ON "AccessToken"("distributionId", "employeeId");

ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "SurveyDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
