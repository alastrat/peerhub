import { prisma } from "@/lib/db/prisma";
import { calculateNPS } from "@/lib/constants/climate-survey";

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  average: number;
  count: number;
}

export interface QuestionResult {
  questionId: string;
  text: string;
  type: string;
  dimensionName: string | null;
  average: number | null;
  count: number;
  distribution: Record<number, number>;
  textResponses: string[];
}

export interface DepartmentDimensionScore {
  departmentId: string;
  departmentName: string;
  dimensionId: string;
  dimensionName: string;
  average: number;
  count: number;
}

export interface SurveyResults {
  surveyId: string;
  surveyName: string;
  totalInvited: number;
  totalResponded: number;
  completionRate: number;
  overallAverage: number | null;
  npsScore: number | null;
  dimensionScores: DimensionScore[];
  questionResults: QuestionResult[];
  departmentBreakdown: DepartmentDimensionScore[];
}

export async function getSurveyResults(
  surveyId: string,
  companyId: string
): Promise<SurveyResults | null> {
  const survey = await prisma.climateSurvey.findFirst({
    where: { id: surveyId, companyId },
    include: {
      questions: {
        include: { dimension: true },
        orderBy: { order: "asc" },
      },
      distributions: {
        include: {
          responses: {
            include: {
              answers: true,
              employee: {
                select: { departmentId: true, department: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!survey) return null;

  // Flatten all responses
  const allResponses = survey.distributions.flatMap((d) => d.responses);
  const completedResponses = allResponses.filter((r) => r.isComplete);
  const totalInvited = allResponses.length;
  const totalResponded = completedResponses.length;
  const completionRate = totalInvited > 0 ? Math.round((totalResponded / totalInvited) * 100) : 0;

  // All answers from completed responses
  const allAnswers = completedResponses.flatMap((r) => r.answers);

  // Question-level results
  const questionResults: QuestionResult[] = survey.questions.map((q) => {
    const answers = allAnswers.filter((a) => a.questionId === q.id);
    const ratingAnswers = answers.filter((a) => a.ratingValue != null);
    const textAnswers = answers.filter((a) => a.textValue).map((a) => a.textValue!);

    const average =
      ratingAnswers.length > 0
        ? ratingAnswers.reduce((sum, a) => sum + a.ratingValue!, 0) / ratingAnswers.length
        : null;

    // Distribution of ratings
    const distribution: Record<number, number> = {};
    for (const a of ratingAnswers) {
      distribution[a.ratingValue!] = (distribution[a.ratingValue!] || 0) + 1;
    }

    return {
      questionId: q.id,
      text: q.text,
      type: q.type,
      dimensionName: q.dimension?.name || null,
      average: average != null ? Math.round(average * 100) / 100 : null,
      count: ratingAnswers.length,
      distribution,
      textResponses: textAnswers,
    };
  });

  // Dimension-level averages
  const dimensionMap = new Map<string, { name: string; ratings: number[] }>();
  for (const q of survey.questions) {
    if (!q.dimensionId || !q.dimension) continue;
    const answers = allAnswers.filter((a) => a.questionId === q.id && a.ratingValue != null);
    if (!dimensionMap.has(q.dimensionId)) {
      dimensionMap.set(q.dimensionId, { name: q.dimension.name, ratings: [] });
    }
    const entry = dimensionMap.get(q.dimensionId)!;
    entry.ratings.push(...answers.map((a) => a.ratingValue!));
  }

  const dimensionScores: DimensionScore[] = Array.from(dimensionMap.entries()).map(
    ([dimensionId, { name, ratings }]) => ({
      dimensionId,
      dimensionName: name,
      average: ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100 : 0,
      count: ratings.length,
    })
  );

  // Overall average (all numeric answers)
  const allRatings = allAnswers.filter((a) => a.ratingValue != null).map((a) => a.ratingValue!);
  const overallAverage =
    allRatings.length > 0
      ? Math.round((allRatings.reduce((s, r) => s + r, 0) / allRatings.length) * 100) / 100
      : null;

  // NPS score (only for NPS-type questions)
  const npsQuestions = survey.questions.filter((q) => q.type === "NPS");
  let npsScore: number | null = null;
  if (npsQuestions.length > 0) {
    const npsRatings = allAnswers
      .filter((a) => npsQuestions.some((q) => q.id === a.questionId) && a.ratingValue != null)
      .map((a) => a.ratingValue!);
    if (npsRatings.length > 0) {
      npsScore = calculateNPS(npsRatings);
    }
  }

  // Department breakdown
  const deptDimensionMap = new Map<string, { departmentName: string; dimensions: Map<string, { dimensionName: string; ratings: number[] }> }>();

  for (const response of completedResponses) {
    const dept = response.employee?.department;
    if (!dept) continue;

    if (!deptDimensionMap.has(dept.id)) {
      deptDimensionMap.set(dept.id, { departmentName: dept.name, dimensions: new Map() });
    }
    const deptEntry = deptDimensionMap.get(dept.id)!;

    for (const answer of response.answers) {
      if (answer.ratingValue == null) continue;
      const question = survey.questions.find((q) => q.id === answer.questionId);
      if (!question?.dimensionId || !question.dimension) continue;

      if (!deptEntry.dimensions.has(question.dimensionId)) {
        deptEntry.dimensions.set(question.dimensionId, { dimensionName: question.dimension.name, ratings: [] });
      }
      deptEntry.dimensions.get(question.dimensionId)!.ratings.push(answer.ratingValue);
    }
  }

  const departmentBreakdown: DepartmentDimensionScore[] = [];
  for (const [departmentId, { departmentName, dimensions }] of deptDimensionMap) {
    for (const [dimensionId, { dimensionName, ratings }] of dimensions) {
      if (ratings.length > 0) {
        departmentBreakdown.push({
          departmentId,
          departmentName,
          dimensionId,
          dimensionName,
          average: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100,
          count: ratings.length,
        });
      }
    }
  }

  return {
    surveyId: survey.id,
    surveyName: survey.name,
    totalInvited,
    totalResponded,
    completionRate,
    overallAverage,
    npsScore,
    dimensionScores,
    questionResults,
    departmentBreakdown,
  };
}

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
