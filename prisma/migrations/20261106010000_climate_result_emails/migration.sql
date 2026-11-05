-- Results emails from the client's "Modelos de correo". Additive only.

-- A leader's personal results link: reusable until it expires
ALTER TYPE "AccessTokenPurpose" ADD VALUE IF NOT EXISTS 'LEADER_LINK';

ALTER TABLE "ClimateSurvey"
  ADD COLUMN "planReminderDate" TIMESTAMP(3),
  ADD COLUMN "resultsEmailedAt" TIMESTAMP(3),
  ADD COLUMN "closingReportSentAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "reportToken" TEXT;

CREATE UNIQUE INDEX "ClimateSurvey_reportToken_key" ON "ClimateSurvey"("reportToken");
