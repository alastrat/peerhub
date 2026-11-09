import { prisma } from "@/lib/db/prisma";
import { calculateNPS } from "@/lib/constants/climate-survey";
import { CLIMATE_SCALES, getQuestionScale, type ScaleKey } from "@/lib/constants/climate-scales";
import { getInstrumentItemCode } from "@/lib/constants/climate-instrument";
import {
  scoreGroup,
  scoreSegments,
  findGaps,
  isBelowGoal,
  isInstrumentSurvey,
  DEFAULT_GOAL_BAND,
  type ClimateBand,
  type DimensionScore,
  type GroupScore,
  type IndexScore,
  type ScoringAnswer,
  type ScoringQuestion,
  type SegmentRef,
} from "@/lib/utils/climate-scoring";
import {
  resolveSegments,
  inScope,
  type SegmentScope,
  type SegmentSnapshot,
} from "@/lib/utils/climate-segments";
import {
  buildParticipation,
  type ParticipationInvitee,
  type SurveyParticipation,
} from "@/lib/utils/climate-participation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DimensionResult extends DimensionScore {
  dimensionName: string;
  dimensionCode: string | null;
}

export interface QuestionResult {
  questionId: string;
  text: string;
  type: string;
  dimensionId: string | null;
  dimensionName: string | null;
  itemCode: string | null;
  scaleKey: ScaleKey | null;
  scaleMin: number | null;
  scaleMax: number | null;
  average: number | null;
  favorability: number | null;
  count: number;
  distribution: Record<number, number>;
  textResponses: string[];
}

export interface SegmentDimensionCell {
  dimensionId: string;
  mean: number | null;
  favorability: number | null;
  band: ClimateBand | null;
  percent: number | null;
}

export interface SegmentResult {
  segmentId: string;
  segmentName: string;
  respondents: number;
  suppressed: boolean;
  index: IndexScore | null;
  dimensions: SegmentDimensionCell[];
}

export type SegmentType = "department" | "team" | "hub" | "leader";

export interface AttentionSegment {
  type: SegmentType;
  segmentId: string;
  segmentName: string;
  mean: number;
  band: ClimateBand;
  respondents: number;
}

export interface SurveyResults {
  surveyId: string;
  surveyName: string;
  totalInvited: number;
  totalResponded: number;
  completionRate: number;
  isInstrument: boolean;
  instrumentVersion: string | null;
  anonymityThreshold: number;
  goalBand: ClimateBand;
  resultsReleasedAt: Date | null;
  /** True when the whole survey has fewer completed responses than the minimum. */
  suppressed: boolean;
  /** Índice de Clima for instrument surveys; overall mean when all questions share a scale. */
  index: IndexScore | null;
  npsScore: number | null;
  dimensionScores: DimensionResult[];
  questionResults: QuestionResult[];
  departmentBreakdown: SegmentResult[];
  teamBreakdown: SegmentResult[];
  hubBreakdown: SegmentResult[];
  leaderBreakdown: SegmentResult[];
  /** Company-wide instrument dimensions below the goal band, lowest first. */
  gaps: DimensionResult[];
  /** Segments (n ≥ minimum) whose Índice de Clima is below the goal band, lowest first. */
  attentionSegments: AttentionSegment[];
  /** Answered vs. invited per leader and per demographic group (never scores). */
  participation: SurveyParticipation;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const responseEmployeeSelect = {
  departmentId: true,
  hubId: true,
  managerId: true,
  teamMemberships: { select: { teamId: true } },
  gender: true,
  birthDate: true,
  startDate: true,
} as const;

export interface ScoringSurvey {
  id: string;
  name: string;
  companyId: string;
  anonymityThreshold: number;
  goalBand: ClimateBand;
  instrumentVersion: string | null;
  resultsReleasedAt: Date | null;
  questions: (ScoringQuestion & {
    text: string;
    dimension: { id: string; name: string; code: string | null } | null;
  })[];
  invited: number;
  responses: {
    answers: (ScoringAnswer & { textValue: string | null })[];
    segments: SegmentSnapshot;
  }[];
  /** Everyone invited, answered or not. */
  invitees: ParticipationInvitee[];
}

/** Survey questions plus completed responses with resolved segments. */
export async function loadSurveyForScoring(surveyId: string, companyId: string): Promise<ScoringSurvey | null> {
  const survey = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    include: {
      questions: {
        include: { dimension: { select: { id: true, name: true, code: true } } },
        orderBy: { order: "asc" },
      },
      distributions: {
        include: {
          responses: {
            include: {
              answers: { select: { questionId: true, ratingValue: true, textValue: true } },
              employee: { select: responseEmployeeSelect },
            },
          },
        },
      },
    },
  });
  if (!survey) return null;

  const all = survey.distributions.flatMap((d) => d.responses);
  // Tenure of people who haven't answered: at the survey's end once it's over, so it doesn't drift
  const now = new Date();
  const notAnsweredAt = survey.accessEndDate && survey.accessEndDate < now ? survey.accessEndDate : now;
  return {
    id: survey.id,
    name: survey.name,
    companyId: survey.companyId,
    anonymityThreshold: survey.anonymityThreshold ?? 5,
    goalBand: (survey.goalBand as ClimateBand | undefined) ?? DEFAULT_GOAL_BAND,
    instrumentVersion: survey.instrumentVersion ?? null,
    resultsReleasedAt: survey.resultsReleasedAt ?? null,
    questions: survey.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      order: q.order,
      config: q.config,
      dimensionId: q.dimensionId,
      dimension: q.dimension ?? null,
    })),
    invited: all.length,
    responses: all
      .filter((r) => r.isComplete)
      .map((r) => ({
        answers: r.answers,
        segments: resolveSegments(r.segmentSnapshot, r.employee ?? null, r.submittedAt),
      })),
    invitees: all.map((r) => ({
      isComplete: r.isComplete,
      segments: resolveSegments(r.segmentSnapshot, r.employee ?? null, r.submittedAt ?? notAnsweredAt),
    })),
  };
}

// ---------------------------------------------------------------------------
// Shaping
// ---------------------------------------------------------------------------

function dimensionMeta(survey: ScoringSurvey) {
  const meta = new Map<string, { name: string; code: string | null }>();
  for (const q of survey.questions) {
    if (q.dimension) meta.set(q.dimension.id, { name: q.dimension.name, code: q.dimension.code });
  }
  return meta;
}

export function toDimensionResults(score: GroupScore, survey: ScoringSurvey): DimensionResult[] {
  const meta = dimensionMeta(survey);
  return score.dimensions.map((d) => ({
    ...d,
    dimensionName: meta.get(d.dimensionId)?.name ?? "—",
    dimensionCode: meta.get(d.dimensionId)?.code ?? null,
  }));
}

function toSegmentResults(
  survey: ScoringSurvey,
  segmentsOf: (r: ScoringSurvey["responses"][number]) => SegmentRef[],
): SegmentResult[] {
  return scoreSegments(survey.questions, survey.responses, segmentsOf, survey.anonymityThreshold).map((s) => ({
    segmentId: s.segmentId,
    segmentName: s.segmentName,
    respondents: s.respondents,
    suppressed: s.suppressed,
    index: s.index,
    dimensions: s.dimensions.map((d) => ({
      dimensionId: d.dimensionId,
      mean: d.mean,
      favorability: d.favorability,
      band: d.band,
      percent: d.percent,
    })),
  }));
}

async function segmentNames(companyId: string, responses: { segments: SegmentSnapshot }[]) {
  const deptIds = new Set<string>();
  const hubIds = new Set<string>();
  const teamIds = new Set<string>();
  const leaderIds = new Set<string>();
  for (const r of responses) {
    if (r.segments.departmentId) deptIds.add(r.segments.departmentId);
    if (r.segments.hubId) hubIds.add(r.segments.hubId);
    r.segments.teamIds.forEach((t) => teamIds.add(t));
    if (r.segments.leaderEmployeeId) leaderIds.add(r.segments.leaderEmployeeId);
  }
  const [departments, hubs, teams, leaders] = await Promise.all([
    deptIds.size
      ? prisma.department.findMany({ where: { companyId, id: { in: [...deptIds] } }, select: { id: true, name: true } })
      : [],
    hubIds.size
      ? prisma.hub.findMany({ where: { companyId, id: { in: [...hubIds] } }, select: { id: true, name: true } })
      : [],
    teamIds.size
      ? prisma.team.findMany({ where: { companyId, id: { in: [...teamIds] } }, select: { id: true, name: true } })
      : [],
    leaderIds.size
      ? prisma.employee.findMany({ where: { companyId, id: { in: [...leaderIds] } }, select: { id: true, name: true } })
      : [],
  ]);
  const toMap = (rows: { id: string; name: string }[]) => new Map(rows.map((r) => [r.id, r.name]));
  return { departments: toMap(departments), hubs: toMap(hubs), teams: toMap(teams), leaders: toMap(leaders) };
}

// ---------------------------------------------------------------------------
// Survey results (admin)
// ---------------------------------------------------------------------------

export async function getSurveyResults(surveyId: string, companyId: string): Promise<SurveyResults | null> {
  const survey = await loadSurveyForScoring(surveyId, companyId);
  if (!survey) return null;

  const k = survey.anonymityThreshold;
  const totalResponded = survey.responses.length;
  const suppressed = totalResponded < k;
  const company = scoreGroup(survey.questions, survey.responses);
  const isInstrument = isInstrumentSurvey(survey.questions);
  const itemScores = new Map(company.items.map((i) => [i.questionId, i]));

  const questionResults: QuestionResult[] = survey.questions.map((q) => {
    const scale = getQuestionScale(q);
    const item = itemScores.get(q.id);
    const textResponses = suppressed
      ? []
      : survey.responses
          .flatMap((r) => r.answers)
          .filter((a) => a.questionId === q.id && a.textValue)
          .map((a) => a.textValue!);
    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      dimensionId: q.dimensionId,
      dimensionName: q.dimension?.name ?? null,
      itemCode: getInstrumentItemCode(q.config),
      scaleKey: scale?.key ?? null,
      scaleMin: scale?.min ?? null,
      scaleMax: scale?.max ?? null,
      average: suppressed ? null : item?.mean ?? null,
      favorability: suppressed ? null : item?.favorability ?? null,
      count: suppressed ? 0 : item?.n ?? 0,
      distribution: suppressed ? {} : item?.distribution ?? {},
      textResponses,
    };
  });

  // eNPS stays separate from every other score
  let npsScore: number | null = null;
  if (!suppressed) {
    const npsIds = new Set(survey.questions.filter((q) => q.type === "NPS").map((q) => q.id));
    const npsRatings = survey.responses
      .flatMap((r) => r.answers)
      .filter((a) => npsIds.has(a.questionId) && a.ratingValue != null)
      .map((a) => a.ratingValue!)
      .filter((v) => v >= CLIMATE_SCALES.NPS_11.min && v <= CLIMATE_SCALES.NPS_11.max);
    if (npsRatings.length > 0) npsScore = calculateNPS(npsRatings);
  }

  // Everyone invited: respondents plus the leaders of people who haven't answered
  const names = await segmentNames(companyId, survey.invitees);
  const departmentBreakdown = toSegmentResults(survey, (r) =>
    r.segments.departmentId
      ? [{ id: r.segments.departmentId, name: names.departments.get(r.segments.departmentId) ?? "—" }]
      : [],
  );
  const hubBreakdown = toSegmentResults(survey, (r) =>
    r.segments.hubId ? [{ id: r.segments.hubId, name: names.hubs.get(r.segments.hubId) ?? "—" }] : [],
  );
  const teamBreakdown = toSegmentResults(survey, (r) =>
    r.segments.teamIds.filter((t) => names.teams.has(t)).map((t) => ({ id: t, name: names.teams.get(t)! })),
  );
  const leaderBreakdown = toSegmentResults(survey, (r) =>
    r.segments.leaderEmployeeId
      ? [{ id: r.segments.leaderEmployeeId, name: names.leaders.get(r.segments.leaderEmployeeId) ?? "—" }]
      : [],
  );

  const dimensionScores = suppressed ? [] : toDimensionResults(company, survey);
  const gaps = isInstrument ? (findGaps(dimensionScores, survey.goalBand) as DimensionResult[]) : [];

  const attentionSegments: AttentionSegment[] = [];
  if (isInstrument && !suppressed) {
    const collect = (type: SegmentType, list: SegmentResult[]) => {
      for (const s of list) {
        if (s.suppressed || !s.index?.band || s.index.mean == null) continue;
        if (!isBelowGoal(s.index.band, survey.goalBand)) continue;
        attentionSegments.push({
          type,
          segmentId: s.segmentId,
          segmentName: s.segmentName,
          mean: s.index.mean,
          band: s.index.band,
          respondents: s.respondents,
        });
      }
    };
    collect("department", departmentBreakdown);
    collect("hub", hubBreakdown);
    collect("team", teamBreakdown);
    collect("leader", leaderBreakdown);
    attentionSegments.sort((a, b) => a.mean - b.mean);
  }

  return {
    surveyId: survey.id,
    surveyName: survey.name,
    totalInvited: survey.invited,
    totalResponded,
    completionRate: survey.invited > 0 ? Math.round((totalResponded / survey.invited) * 100) : 0,
    isInstrument,
    instrumentVersion: survey.instrumentVersion,
    anonymityThreshold: k,
    goalBand: survey.goalBand,
    resultsReleasedAt: survey.resultsReleasedAt,
    suppressed,
    index: suppressed ? null : company.index,
    npsScore,
    dimensionScores,
    questionResults,
    departmentBreakdown,
    teamBreakdown,
    hubBreakdown,
    leaderBreakdown,
    gaps,
    attentionSegments,
    participation: buildParticipation(survey.invitees, names.leaders),
  };
}

// ---------------------------------------------------------------------------
// Scope scores (leader reports, plan baselines, impact evaluation)
// ---------------------------------------------------------------------------

export interface ScopeScores {
  survey: ScoringSurvey;
  score: GroupScore;
  dimensions: DimensionResult[];
}

/** Scores of one scope (a leader's team, a department…) with the survey's minimum applied. */
export function scoreScope(survey: ScoringSurvey, scope: SegmentScope, scopeRefId: string | null): ScopeScores {
  const responses = survey.responses.filter((r) => inScope(r.segments, scope, scopeRefId));
  const score = scoreGroup(survey.questions, responses, { minGroupSize: survey.anonymityThreshold });
  return { survey, score, dimensions: toDimensionResults(score, survey) };
}

// ---------------------------------------------------------------------------
// eNPS trend
// ---------------------------------------------------------------------------

export async function getENPSTrend(companyId: string): Promise<{ date: Date; score: number }[]> {
  const surveys = await prisma.climateSurvey.findMany({
    where: { companyId, type: "ENPS", status: { in: ["ACTIVE", "CLOSED"] } },
    include: {
      questions: true,
      distributions: {
        include: {
          responses: {
            where: { isComplete: true },
            include: { answers: true },
          },
        },
        orderBy: { sentAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const trend: { date: Date; score: number }[] = [];

  for (const survey of surveys) {
    for (const dist of survey.distributions) {
      if (!dist.sentAt) continue;
      const npsQuestionIds = survey.questions.filter((q) => q.type === "NPS").map((q) => q.id);
      const ratings = dist.responses
        .flatMap((r) => r.answers)
        .filter((a) => npsQuestionIds.includes(a.questionId) && a.ratingValue != null)
        .map((a) => a.ratingValue!);

      if (ratings.length > 0) {
        trend.push({ date: dist.sentAt, score: calculateNPS(ratings) });
      }
    }
  }

  return trend;
}
