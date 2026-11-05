import { prisma } from "@/lib/db/prisma";
import { toSupportedLocale } from "@/i18n/translator";
import type { SupportedLocale } from "@/i18n/routing";
import { BUSINESS_TIME_ZONE } from "@/lib/constants/business-time";
import { getClimateSurveyTypeLabel } from "@/lib/constants/climate-survey";
import { getPlatformTheme } from "@/lib/queries/platform-theme";
import { parseColorConfig, resolveColors } from "@/lib/utils/wallpaper";
import {
  defaultScaleText,
  introParagraphs,
  reportDimensions,
  reportSchedule,
  splitScaleText,
  type ReportDimension,
} from "@/lib/utils/climate-report";

/** Everything the report cover shows, with dates already formatted (no hydration drift). */
export interface ReportCoverData {
  surveyName: string;
  typeLabel: string;
  companyName: string;
  logoUrl: string | null;
  colors: { accent: string; title: string; text: string };
  schedule: { range: string; startTime: string | null; endTime: string | null; days: number } | null;
  extraDuration: string | null;
  scaleItems: string[];
  /** Null when the survey has no intro of its own: the cover shows the default one. */
  intro: string[] | null;
  dimensions: ReportDimension[];
  questionCount: number;
}

export interface ReportSurvey {
  id: string;
  status: string;
  instrumentVersion: string | null;
  featureHubs: boolean;
  locale: SupportedLocale;
  cover: ReportCoverData;
}

function intlLocale(locale: SupportedLocale) {
  return locale === "en" ? "en-US" : "es-CO";
}

/** A long date ("4 de noviembre de 2026") in the business time zone. */
export function formatReportDate(date: Date, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date);
}

/** A climate survey of the company with its report cover. */
export async function getReportSurvey(surveyId: string, companyId: string): Promise<ReportSurvey | null> {
  const [survey, platformTheme] = await Promise.all([
    prisma.climateSurvey.findFirst({
      where: { id: surveyId, companyId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        instrumentVersion: true,
        logoUrl: true,
        themeColor: true,
        colorConfig: true,
        accessStartDate: true,
        accessEndDate: true,
        reportExtraDuration: true,
        reportScaleText: true,
        reportIntroText: true,
        company: { select: { name: true, logo: true, locale: true, featureHubs: true } },
        questions: {
          select: { type: true, config: true, dimension: { select: { id: true, name: true } } },
          orderBy: { order: "asc" },
        },
        distributions: { select: { sentAt: true, dueDate: true } },
      },
    }),
    getPlatformTheme(),
  ]);
  if (!survey) return null;

  const locale = toSupportedLocale(survey.company.locale);
  const colors = resolveColors(parseColorConfig(survey.colorConfig), survey.themeColor ?? undefined, platformTheme);
  const schedule = reportSchedule(
    {
      accessStartDate: survey.accessStartDate,
      accessEndDate: survey.accessEndDate,
      distributions: survey.distributions,
    },
    BUSINESS_TIME_ZONE,
  );
  const dateFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
  const timeFmt = new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  });

  return {
    id: survey.id,
    status: survey.status,
    instrumentVersion: survey.instrumentVersion,
    featureHubs: survey.company.featureHubs,
    locale,
    cover: {
      surveyName: survey.name,
      typeLabel: getClimateSurveyTypeLabel(survey.type, locale),
      companyName: survey.company.name,
      logoUrl: survey.logoUrl ?? survey.company.logo,
      colors: { accent: colors.buttons, title: colors.titleText, text: colors.pageText },
      schedule: schedule && {
        range: dateFmt.formatRange(schedule.start, schedule.end),
        startTime: schedule.hasStartTime ? timeFmt.format(schedule.start) : null,
        endTime: schedule.hasEndTime ? timeFmt.format(schedule.end) : null,
        days: schedule.days,
      },
      extraDuration: survey.reportExtraDuration,
      scaleItems: splitScaleText(survey.reportScaleText ?? defaultScaleText(survey.questions, locale)),
      intro: survey.reportIntroText ? introParagraphs(survey.reportIntroText) : null,
      dimensions: reportDimensions(survey.questions),
      questionCount: survey.questions.length,
    },
  };
}
