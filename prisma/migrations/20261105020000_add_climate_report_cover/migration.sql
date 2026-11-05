-- Report cover settings ("Portada del informe") on climate surveys.
-- Additive only: three nullable columns, nothing renamed or dropped. Null
-- means the report shows its default text, so existing surveys need no data.

-- AlterTable
ALTER TABLE "ClimateSurvey" ADD COLUMN     "reportExtraDuration" TEXT,
ADD COLUMN     "reportIntroText" TEXT,
ADD COLUMN     "reportScaleText" TEXT;
