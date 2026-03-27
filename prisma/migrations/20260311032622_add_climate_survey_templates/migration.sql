-- AlterTable
ALTER TABLE "ClimateSurvey" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "ClimateSurveyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT,
    "type" "ClimateSurveyType" NOT NULL DEFAULT 'CLIMATE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimateSurveyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateSurveyTemplateQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dimensionId" TEXT,
    "text" TEXT NOT NULL,
    "type" "SurveyQuestionType" NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimateSurveyTemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClimateSurveyTemplate_companyId_idx" ON "ClimateSurveyTemplate"("companyId");

-- CreateIndex
CREATE INDEX "ClimateSurveyTemplateQuestion_templateId_idx" ON "ClimateSurveyTemplateQuestion"("templateId");

-- AddForeignKey
ALTER TABLE "ClimateSurveyTemplate" ADD CONSTRAINT "ClimateSurveyTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateSurveyTemplateQuestion" ADD CONSTRAINT "ClimateSurveyTemplateQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClimateSurveyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateSurveyTemplateQuestion" ADD CONSTRAINT "ClimateSurveyTemplateQuestion_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "ClimateDimension"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimateSurvey" ADD CONSTRAINT "ClimateSurvey_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClimateSurveyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
