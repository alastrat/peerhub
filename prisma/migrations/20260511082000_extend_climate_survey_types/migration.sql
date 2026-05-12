-- Adds three new survey types so the nav can offer dedicated lists for
-- Liderazgo, Cultura, and Desempeño alongside the existing Clima / Pulso / NPS.
ALTER TYPE "ClimateSurveyType" ADD VALUE 'LEADERSHIP';
ALTER TYPE "ClimateSurveyType" ADD VALUE 'CULTURE';
ALTER TYPE "ClimateSurveyType" ADD VALUE 'PERFORMANCE';
