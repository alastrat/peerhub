-- CreateEnum
CREATE TYPE "ClimateBand" AS ENUM ('MUY_DESFAVORABLE', 'DESFAVORABLE', 'FAVORABLE', 'MUY_FAVORABLE');

-- CreateEnum
CREATE TYPE "ActionPlanScope" AS ENUM ('LEADER', 'DEPARTMENT', 'HUB', 'TEAM', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ActionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionMeasureKind" AS ENUM ('OUTCOME', 'PROCESS');

-- AlterTable
ALTER TABLE "ClimateDimension" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "ClimateSurvey" ADD COLUMN     "followUpUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "planReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "goalBand" "ClimateBand" NOT NULL DEFAULT 'FAVORABLE',
ADD COLUMN     "instrumentVersion" TEXT,
ADD COLUMN     "planDueDate" TIMESTAMP(3),
ADD COLUMN     "planMinPerLeader" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resultsReleasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClimateSurveyTemplate" ADD COLUMN     "instrumentVersion" TEXT;

-- AlterTable
ALTER TABLE "SurveyResponse" ADD COLUMN     "segmentSnapshot" JSONB;

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "scope" "ActionPlanScope" NOT NULL,
    "scopeRefId" TEXT,
    "ownerEmployeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "baselineMean" DOUBLE PRECISION NOT NULL,
    "baselineFavorability" DOUBLE PRECISION,
    "baselineBand" "ClimateBand" NOT NULL,
    "baselineN" INTEGER NOT NULL,
    "targetBand" "ClimateBand" NOT NULL,
    "targetMean" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ActionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "closingNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdByUserId" TEXT,
    "createdByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlanTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerEmployeeId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ActionTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "suggestedActionCode" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlanMeasure" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "taskId" TEXT,
    "kind" "ActionMeasureKind" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "baselineValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "followUpSurveyId" TEXT,
    "resultMean" DOUBLE PRECISION,
    "resultFavorability" DOUBLE PRECISION,
    "resultBand" "ClimateBand",
    "resultN" INTEGER,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlanMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlanUpdate" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "taskId" TEXT,
    "measureId" TEXT,
    "authorEmployeeId" TEXT,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "statusFrom" TEXT,
    "statusTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionPlanUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlanEvidence" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedByEmployeeId" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionPlanEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderSurveyContext" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "leaderEmployeeId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderSurveyContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionPlan_companyId_idx" ON "ActionPlan"("companyId");

-- CreateIndex
CREATE INDEX "ActionPlan_surveyId_scope_scopeRefId_idx" ON "ActionPlan"("surveyId", "scope", "scopeRefId");

-- CreateIndex
CREATE INDEX "ActionPlan_ownerEmployeeId_idx" ON "ActionPlan"("ownerEmployeeId");

-- CreateIndex
CREATE INDEX "ActionPlanTask_planId_idx" ON "ActionPlanTask"("planId");

-- CreateIndex
CREATE INDEX "ActionPlanTask_ownerEmployeeId_status_idx" ON "ActionPlanTask"("ownerEmployeeId", "status");

-- CreateIndex
CREATE INDEX "ActionPlanMeasure_planId_idx" ON "ActionPlanMeasure"("planId");

-- CreateIndex
CREATE INDEX "ActionPlanUpdate_planId_createdAt_idx" ON "ActionPlanUpdate"("planId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionPlanEvidence_taskId_idx" ON "ActionPlanEvidence"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderSurveyContext_surveyId_leaderEmployeeId_key" ON "LeaderSurveyContext"("surveyId", "leaderEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClimateDimension_code_key" ON "ClimateDimension"("code");

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ClimateSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "ClimateDimension"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "Employee"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanTask" ADD CONSTRAINT "ActionPlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanTask" ADD CONSTRAINT "ActionPlanTask_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanMeasure" ADD CONSTRAINT "ActionPlanMeasure_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanMeasure" ADD CONSTRAINT "ActionPlanMeasure_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ActionPlanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanUpdate" ADD CONSTRAINT "ActionPlanUpdate_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ActionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanUpdate" ADD CONSTRAINT "ActionPlanUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ActionPlanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanUpdate" ADD CONSTRAINT "ActionPlanUpdate_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "ActionPlanMeasure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlanEvidence" ADD CONSTRAINT "ActionPlanEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ActionPlanTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderSurveyContext" ADD CONSTRAINT "LeaderSurveyContext_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ClimateSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderSurveyContext" ADD CONSTRAINT "LeaderSurveyContext_leaderEmployeeId_fkey" FOREIGN KEY ("leaderEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- SurveyAnswer.question cascades: deleting a survey or company with answers
-- used to fail on this constraint.
ALTER TABLE "SurveyAnswer" DROP CONSTRAINT "SurveyAnswer_questionId_fkey";
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: stamp every existing LIKERT question with the scale it was answered on.
-- The portal has shown LIKERT as Nunca…Siempre (1–4) since 2026-04-16; a
-- question with any answer above 4 was answered on the older 1–5 scale.
UPDATE "SurveyQuestion" q
SET "config" = COALESCE(q."config", '{}'::jsonb) || jsonb_build_object(
  'scale',
  CASE WHEN EXISTS (
    SELECT 1 FROM "SurveyAnswer" a WHERE a."questionId" = q."id" AND a."ratingValue" > 4
  ) THEN 'AGREE_5' ELSE 'FREQ_4' END
)
WHERE q."type" = 'LIKERT'
  AND (q."config" IS NULL OR jsonb_typeof(q."config") <> 'object' OR NOT (q."config" ? 'scale'));

UPDATE "ClimateSurveyTemplateQuestion"
SET "config" = COALESCE("config", '{}'::jsonb) || '{"scale": "FREQ_4"}'::jsonb
WHERE "type" = 'LIKERT'
  AND ("config" IS NULL OR jsonb_typeof("config") <> 'object' OR NOT ("config" ? 'scale'));
