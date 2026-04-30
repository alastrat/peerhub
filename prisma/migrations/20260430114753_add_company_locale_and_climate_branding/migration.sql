-- AlterTable
ALTER TABLE "ClimateSurvey" ADD COLUMN     "accessEndDate" TIMESTAMP(3),
ADD COLUMN     "accessStartDate" TIMESTAMP(3),
ADD COLUMN     "colorConfig" JSONB,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "questionsPerPage" INTEGER,
ADD COLUMN     "thankYouBody" TEXT,
ADD COLUMN     "thankYouCtaText" TEXT,
ADD COLUMN     "thankYouTitle" TEXT,
ADD COLUMN     "themeColor" TEXT,
ADD COLUMN     "wallpaperConfig" JSONB,
ADD COLUMN     "welcomeBannerUrl" TEXT,
ADD COLUMN     "welcomeBody" TEXT,
ADD COLUMN     "welcomeCtaText" TEXT,
ADD COLUMN     "welcomeTitle" TEXT;
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'es';
