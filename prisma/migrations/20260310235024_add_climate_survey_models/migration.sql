-- CreateEnum
CREATE TYPE "ClimateSurveyType" AS ENUM ('CLIMATE', 'PULSE', 'ENPS');

-- CreateEnum
CREATE TYPE "ClimateSurveyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('LIKERT', 'TEXT', 'NPS', 'RATING');

-- CreateEnum
CREATE TYPE "SurveyTargetType" AS ENUM ('ALL', 'DEPARTMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SurveyFrequency" AS ENUM ('ONCE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL');

-- CreateTable
CREATE TABLE "ClimateSurvey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "type" "ClimateSurveyType" NOT NULL DEFAULT 'CLIMATE',
    "status" "ClimateSurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "frequency" "SurveyFrequency" NOT NULL DEFAULT 'ONCE',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimateSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateDimension" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimateDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "dimensionId" TEXT,
    "text" TEXT NOT NULL,
    "type" "SurveyQuestionType" NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDistribution" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "targetType" "SurveyTargetType" NOT NULL DEFAULT 'ALL',
    "targetIds" TEXT[],
    "sentAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "employeeId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "ratingValue" INTEGER,
    "textValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClimateSurvey_companyId_idx" ON "ClimateSurvey"("companyId");

-- CreateIndex
CREATE INDEX "ClimateSurvey_status_idx" ON "ClimateSurvey"("status");

-- CreateIndex
CREATE INDEX "ClimateDimension_companyId_idx" ON "ClimateDimension"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ClimateDimension_companyId_name_key" ON "ClimateDimension"("companyId", "name");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyId_idx" ON "SurveyQuestion"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyDistribution_surveyId_idx" ON "SurveyDistribution"("surveyId");

-- CreateIndex
CREATE INDEX "SurveyResponse_distributionId_idx" ON "SurveyResponse"("distributionId");

-- CreateIndex
CREATE INDEX "SurveyResponse_employeeId_idx" ON "SurveyResponse"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_distributionId_employeeId_key" ON "SurveyResponse"("distributionId", "employeeId");

-- CreateIndex
CREATE INDEX "SurveyAnswer_responseId_idx" ON "SurveyAnswer"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAnswer_responseId_questionId_key" ON "SurveyAnswer"("responseId", "questionId");

-- AddForeignKey
ALTER TABLE "ClimateSurvey" ADD CONSTRAINT "ClimateSurvey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateDimension" ADD CONSTRAINT "ClimateDimension_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ClimateSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "ClimateDimension"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDistribution" ADD CONSTRAINT "SurveyDistribution_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ClimateSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "SurveyDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyAnswer" ADD CONSTRAINT "SurveyAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
