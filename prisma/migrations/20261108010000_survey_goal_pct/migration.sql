-- Survey goal as a % of favorable answers (Kultiva's POC default: 75)
ALTER TABLE "ClimateSurvey" ADD COLUMN "goalPct" INTEGER NOT NULL DEFAULT 75;
