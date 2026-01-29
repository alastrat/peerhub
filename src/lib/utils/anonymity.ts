import type { ReviewerType } from "@prisma/client";

interface ReviewResponse {
  ratingValue?: number | null;
  textValue?: string | null;
  reviewerType: ReviewerType;
}

interface AggregatedRating {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

interface AggregatedResult {
  isVisible: boolean;
  message?: string;
  ratings?: AggregatedRating;
  textResponses?: string[];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function aggregateRatings(
  responses: { ratingValue?: number | null }[],
  threshold: number
): AggregatedResult {
  const validResponses = responses.filter(
    (r) => r.ratingValue !== null && r.ratingValue !== undefined
  );

  if (validResponses.length < threshold) {
    return {
      isVisible: false,
      message: `Minimum ${threshold} responses required for anonymity`,
    };
  }

  const ratings = validResponses.map((r) => r.ratingValue as number);
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = sum / ratings.length;

  const distribution: Record<number, number> = {};
  for (const rating of ratings) {
    distribution[rating] = (distribution[rating] || 0) + 1;
  }

  return {
    isVisible: true,
    ratings: {
      average: Math.round(average * 100) / 100,
      count: ratings.length,
      distribution,
    },
  };
}

export function aggregateTextResponses(
  responses: { textValue?: string | null }[],
  threshold: number
): AggregatedResult {
  const validResponses = responses
    .filter((r) => r.textValue && r.textValue.trim())
    .map((r) => r.textValue as string);

  if (validResponses.length < threshold) {
    return {
      isVisible: false,
      message: `Minimum ${threshold} responses required for anonymity`,
    };
  }

  return {
    isVisible: true,
    textResponses: shuffleArray(validResponses),
  };
}

export function groupResponsesByReviewerType(
  responses: ReviewResponse[],
  threshold: number
): Record<ReviewerType, AggregatedResult> {
  const groups: Record<ReviewerType, ReviewResponse[]> = {
    SELF: [],
    MANAGER: [],
    PEER: [],
    DIRECT_REPORT: [],
    EXTERNAL: [],
  };

  for (const response of responses) {
    groups[response.reviewerType].push(response);
  }

  const result: Record<ReviewerType, AggregatedResult> = {} as Record<
    ReviewerType,
    AggregatedResult
  >;

  for (const [type, typeResponses] of Object.entries(groups)) {
    const reviewerType = type as ReviewerType;

    // Self and Manager are always shown individually (no anonymity needed)
    if (reviewerType === "SELF" || reviewerType === "MANAGER") {
      result[reviewerType] = aggregateRatings(typeResponses, 1);
    } else {
      // Apply threshold for peer, direct report, and external
      result[reviewerType] = aggregateRatings(typeResponses, threshold);
    }
  }

  return result;
}

export function calculateOverallScore(
  groupedResults: Record<ReviewerType, AggregatedResult>,
  weights?: Partial<Record<ReviewerType, number>>
): { score: number; count: number } | null {
  const defaultWeights: Record<ReviewerType, number> = {
    SELF: 0.1,
    MANAGER: 0.3,
    PEER: 0.3,
    DIRECT_REPORT: 0.2,
    EXTERNAL: 0.1,
  };

  const appliedWeights = { ...defaultWeights, ...weights };

  let totalWeight = 0;
  let weightedSum = 0;
  let totalCount = 0;

  for (const [type, result] of Object.entries(groupedResults)) {
    if (result.isVisible && result.ratings) {
      const weight = appliedWeights[type as ReviewerType];
      weightedSum += result.ratings.average * weight;
      totalWeight += weight;
      totalCount += result.ratings.count;
    }
  }

  if (totalWeight === 0) return null;

  return {
    score: Math.round((weightedSum / totalWeight) * 100) / 100,
    count: totalCount,
  };
}

export function categorizeTextFeedback(
  responses: { textValue?: string | null; questionType?: string }[]
): { strengths: string[]; opportunities: string[] } {
  const strengths: string[] = [];
  const opportunities: string[] = [];

  for (const response of responses) {
    if (!response.textValue?.trim()) continue;

    // Simple heuristic based on question type or keywords
    const text = response.textValue.toLowerCase();
    const isStrength =
      response.questionType === "strength" ||
      text.includes("strength") ||
      text.includes("excel") ||
      text.includes("great at") ||
      text.includes("impressive") ||
      text.includes("well");

    if (isStrength) {
      strengths.push(response.textValue);
    } else {
      opportunities.push(response.textValue);
    }
  }

  return {
    strengths: shuffleArray(strengths),
    opportunities: shuffleArray(opportunities),
  };
}
