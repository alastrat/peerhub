import { prisma } from "@/lib/db/prisma";
import type { ReviewerType } from "@prisma/client";
import type { IndividualReport, QuestionReport, AggregatedRating } from "@/types";
import {
  aggregateRatings,
  aggregateTextResponses,
  groupResponsesByReviewerType,
  calculateOverallScore,
  shuffleArray,
} from "@/lib/utils/anonymity";

interface ReportQueryOptions {
  cycleId: string;
  companyId: string;
}

interface EmployeeReportOptions extends ReportQueryOptions {
  companyUserId: string;
}

export async function getEmployeeReport(
  options: EmployeeReportOptions
): Promise<IndividualReport | null> {
  const { cycleId, companyId, companyUserId } = options;

  // Get cycle with template and participant info
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId },
    include: {
      template: {
        include: {
          sections: {
            include: {
              questions: true,
            },
            orderBy: { order: "asc" },
          },
        },
      },
      participants: {
        where: { companyUserId },
        include: {
          companyUser: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!cycle || cycle.participants.length === 0) {
    return null;
  }

  const participant = cycle.participants[0];
  const threshold = cycle.anonymityThreshold;

  // Get all completed review responses for this participant
  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      cycleId,
      revieweeId: companyUserId,
      status: "COMPLETED",
    },
    include: {
      responses: {
        include: {
          question: true,
        },
      },
    },
  });

  // Build response counts by reviewer type
  const responseCounts: Record<ReviewerType, number> = {
    SELF: 0,
    MANAGER: 0,
    PEER: 0,
    DIRECT_REPORT: 0,
    EXTERNAL: 0,
  };

  assignments.forEach((a) => {
    responseCounts[a.reviewerType]++;
  });

  // Group all responses by question
  const responsesByQuestion: Record<
    string,
    Array<{
      ratingValue?: number | null;
      textValue?: string | null;
      reviewerType: ReviewerType;
    }>
  > = {};

  assignments.forEach((assignment) => {
    assignment.responses.forEach((response) => {
      if (!responsesByQuestion[response.questionId]) {
        responsesByQuestion[response.questionId] = [];
      }
      responsesByQuestion[response.questionId].push({
        ratingValue: response.ratingValue,
        textValue: response.textValue,
        reviewerType: assignment.reviewerType,
      });
    });
  });

  // Build sections with aggregated results
  const sections = cycle.template.sections.map((section) => {
    const questions: QuestionReport[] = section.questions
      .sort((a, b) => a.order - b.order)
      .map((question) => {
        const responses = responsesByQuestion[question.id] || [];
        const byReviewerType: QuestionReport["byReviewerType"] = {} as QuestionReport["byReviewerType"];

        // Calculate results for each reviewer type
        const reviewerTypes: ReviewerType[] = [
          "SELF",
          "MANAGER",
          "PEER",
          "DIRECT_REPORT",
          "EXTERNAL",
        ];

        for (const type of reviewerTypes) {
          const typeResponses = responses.filter((r) => r.reviewerType === type);

          // Self and Manager are always shown (threshold of 1)
          const typeThreshold = type === "SELF" || type === "MANAGER" ? 1 : threshold;

          if (question.type === "RATING" || question.type === "COMPETENCY_RATING") {
            const aggregated = aggregateRatings(typeResponses, typeThreshold);
            byReviewerType[type] = {
              isVisible: aggregated.isVisible,
              rating: aggregated.ratings,
              message: aggregated.message,
            };
          } else if (question.type === "TEXT") {
            const aggregated = aggregateTextResponses(typeResponses, typeThreshold);
            byReviewerType[type] = {
              isVisible: aggregated.isVisible,
              textResponses: aggregated.textResponses,
              message: aggregated.message,
            };
          } else {
            byReviewerType[type] = { isVisible: false };
          }
        }

        // Calculate overall rating across visible types
        let overall: AggregatedRating | undefined;
        if (question.type === "RATING" || question.type === "COMPETENCY_RATING") {
          const allRatings = responses
            .filter((r) => r.ratingValue !== null && r.ratingValue !== undefined)
            .map((r) => r.ratingValue as number);

          if (allRatings.length >= threshold) {
            const sum = allRatings.reduce((a, b) => a + b, 0);
            const distribution: Record<number, number> = {};
            allRatings.forEach((r) => {
              distribution[r] = (distribution[r] || 0) + 1;
            });
            overall = {
              average: Math.round((sum / allRatings.length) * 100) / 100,
              count: allRatings.length,
              distribution,
            };
          }
        }

        return {
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          byReviewerType,
          overall,
        };
      });

    return {
      sectionId: section.id,
      sectionTitle: section.title,
      questions,
    };
  });

  // Calculate overall score
  const allRatingResponses = assignments.flatMap((a) =>
    a.responses
      .filter((r) => r.question.type === "RATING" || r.question.type === "COMPETENCY_RATING")
      .map((r) => ({
        ratingValue: r.ratingValue,
        reviewerType: a.reviewerType,
      }))
  );

  const groupedForScore = groupResponsesByReviewerType(allRatingResponses, threshold);
  const overallScoreResult = calculateOverallScore(groupedForScore);

  // Collect text feedback for strengths/opportunities
  const textResponses = assignments.flatMap((a) =>
    a.responses
      .filter((r) => r.textValue && r.textValue.trim())
      .map((r) => ({
        text: r.textValue as string,
        questionText: r.question.text.toLowerCase(),
      }))
  );

  // Categorize based on question text or keywords
  const strengths: string[] = [];
  const opportunities: string[] = [];

  textResponses.forEach(({ text, questionText }) => {
    const isStrengthQuestion =
      questionText.includes("strength") ||
      questionText.includes("excel") ||
      questionText.includes("best") ||
      questionText.includes("positive");

    const isOpportunityQuestion =
      questionText.includes("improve") ||
      questionText.includes("opportunit") ||
      questionText.includes("develop") ||
      questionText.includes("growth");

    if (isStrengthQuestion) {
      strengths.push(text);
    } else if (isOpportunityQuestion) {
      opportunities.push(text);
    }
  });

  return {
    cycleId: cycle.id,
    cycleName: cycle.name,
    participantId: companyUserId,
    participantName: participant.companyUser.user.name || participant.companyUser.user.email,
    overallScore: overallScoreResult?.score ?? null,
    responseCounts,
    sections,
    strengths: shuffleArray(strengths),
    opportunities: shuffleArray(opportunities),
    releasedAt: participant.releasedAt,
  };
}

export async function getCycleReportSummary(options: ReportQueryOptions) {
  const { cycleId, companyId } = options;

  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, companyId },
    include: {
      participants: {
        include: {
          companyUser: {
            include: { user: true },
          },
        },
      },
      assignments: {
        include: {
          responses: true,
        },
      },
    },
  });

  if (!cycle) return null;

  // Build participant summary
  const participantSummaries = cycle.participants.map((participant) => {
    const participantAssignments = cycle.assignments.filter(
      (a) => a.revieweeId === participant.companyUserId
    );

    const completedCount = participantAssignments.filter(
      (a) => a.status === "COMPLETED"
    ).length;

    const totalCount = participantAssignments.length;
    const hasMinimumResponses = completedCount >= cycle.anonymityThreshold;

    return {
      participantId: participant.companyUserId,
      participantName:
        participant.companyUser.user.name || participant.companyUser.user.email,
      email: participant.companyUser.user.email,
      avatarUrl: participant.companyUser.user.image,
      completedReviews: completedCount,
      totalReviews: totalCount,
      hasMinimumResponses,
      releasedAt: participant.releasedAt,
    };
  });

  const releasedCount = participantSummaries.filter((p) => p.releasedAt).length;
  const readyCount = participantSummaries.filter(
    (p) => p.hasMinimumResponses && !p.releasedAt
  ).length;

  return {
    cycleId: cycle.id,
    cycleName: cycle.name,
    status: cycle.status,
    anonymityThreshold: cycle.anonymityThreshold,
    participants: participantSummaries,
    stats: {
      total: participantSummaries.length,
      released: releasedCount,
      ready: readyCount,
      notReady: participantSummaries.length - releasedCount - readyCount,
    },
  };
}

export async function getReleasedReportsForUser(
  companyUserId: string,
  companyId: string
) {
  const participants = await prisma.cycleParticipant.findMany({
    where: {
      companyUserId,
      releasedAt: { not: null },
      cycle: { companyId },
    },
    include: {
      cycle: {
        include: {
          template: true,
        },
      },
    },
    orderBy: { releasedAt: "desc" },
  });

  return participants.map((p) => ({
    cycleId: p.cycleId,
    cycleName: p.cycle.name,
    templateName: p.cycle.template.name,
    releasedAt: p.releasedAt as Date,
    reviewEndDate: p.cycle.reviewEndDate,
  }));
}

export async function getCyclesWithReports(companyId: string) {
  const cycles = await prisma.cycle.findMany({
    where: {
      companyId,
      status: { in: ["IN_PROGRESS", "CLOSED"] },
    },
    include: {
      template: true,
      participants: true,
      assignments: {
        where: { status: "COMPLETED" },
      },
      _count: {
        select: {
          participants: true,
          assignments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return cycles.map((cycle) => {
    const releasedCount = cycle.participants.filter((p) => p.releasedAt).length;
    const completedAssignments = cycle.assignments.length;

    return {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      templateName: cycle.template.name,
      participantCount: cycle._count.participants,
      completedReviews: completedAssignments,
      totalReviews: cycle._count.assignments,
      releasedCount,
      reviewEndDate: cycle.reviewEndDate,
    };
  });
}
