-- Additive: a new array column with a default, so existing rows and code that
-- doesn't know the column keep working.
ALTER TABLE "ClimateSurvey" ADD COLUMN "followUpEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
