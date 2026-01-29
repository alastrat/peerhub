import { prisma } from "@/lib/db/prisma";
import type { ReviewerType, CycleStatus, ReviewAssignmentStatus } from "@prisma/client";

interface DashboardStatsOptions {
  companyId: string;
}

export async function getDashboardStats(options: DashboardStatsOptions) {
  const { companyId } = options;

  // Get counts in parallel
  const [
    employeeCount,
    activeCycleCount,
    pendingReviewCount,
    completedReviewCount,
    recentCycles,
  ] = await Promise.all([
    // Total active employees
    prisma.companyUser.count({
      where: { companyId, isActive: true },
    }),

    // Active cycles (IN_PROGRESS or NOMINATION)
    prisma.cycle.count({
      where: {
        companyId,
        status: { in: ["IN_PROGRESS", "NOMINATION"] },
      },
    }),

    // Pending reviews across all active cycles
    prisma.reviewAssignment.count({
      where: {
        cycle: { companyId, status: "IN_PROGRESS" },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    }),

    // Completed reviews across all active cycles
    prisma.reviewAssignment.count({
      where: {
        cycle: { companyId, status: "IN_PROGRESS" },
        status: "COMPLETED",
      },
    }),

    // Recent cycles for overview
    prisma.cycle.findMany({
      where: { companyId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
        _count: {
          select: {
            participants: true,
            assignments: true,
          },
        },
      },
    }),
  ]);

  const totalReviews = pendingReviewCount + completedReviewCount;
  const completionRate = totalReviews > 0
    ? Math.round((completedReviewCount / totalReviews) * 100)
    : 0;

  return {
    employeeCount,
    activeCycleCount,
    pendingReviewCount,
    completedReviewCount,
    completionRate,
    recentCycles: recentCycles.map((cycle) => ({
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      templateName: cycle.template.name,
      participantCount: cycle._count.participants,
      assignmentCount: cycle._count.assignments,
      reviewEndDate: cycle.reviewEndDate,
    })),
  };
}

export async function getCycleParticipation(options: DashboardStatsOptions) {
  const { companyId } = options;

  // Get all active cycles with their assignments
  const cycles = await prisma.cycle.findMany({
    where: {
      companyId,
      status: { in: ["IN_PROGRESS", "CLOSED"] },
    },
    include: {
      assignments: {
        select: {
          reviewerType: true,
          status: true,
        },
      },
    },
    orderBy: { reviewStartDate: "asc" },
    take: 10,
  });

  // Build participation data by cycle
  const participationData = cycles.map((cycle) => {
    const byType: Record<ReviewerType, { total: number; completed: number }> = {
      SELF: { total: 0, completed: 0 },
      MANAGER: { total: 0, completed: 0 },
      PEER: { total: 0, completed: 0 },
      DIRECT_REPORT: { total: 0, completed: 0 },
      EXTERNAL: { total: 0, completed: 0 },
    };

    cycle.assignments.forEach((a) => {
      byType[a.reviewerType].total++;
      if (a.status === "COMPLETED") {
        byType[a.reviewerType].completed++;
      }
    });

    const totalAssignments = cycle.assignments.length;
    const completedAssignments = cycle.assignments.filter(
      (a) => a.status === "COMPLETED"
    ).length;

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      date: cycle.reviewStartDate,
      totalAssignments,
      completedAssignments,
      completionRate: totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0,
      byReviewerType: byType,
    };
  });

  return participationData;
}

export async function getCompletionBreakdown(companyId: string) {
  // Get all assignments from active/recent cycles
  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      cycle: {
        companyId,
        status: { in: ["IN_PROGRESS", "CLOSED"] },
      },
    },
    select: {
      reviewerType: true,
      status: true,
    },
  });

  // Build breakdown by reviewer type
  const breakdown: Record<ReviewerType, { total: number; completed: number; rate: number }> = {
    SELF: { total: 0, completed: 0, rate: 0 },
    MANAGER: { total: 0, completed: 0, rate: 0 },
    PEER: { total: 0, completed: 0, rate: 0 },
    DIRECT_REPORT: { total: 0, completed: 0, rate: 0 },
    EXTERNAL: { total: 0, completed: 0, rate: 0 },
  };

  assignments.forEach((a) => {
    breakdown[a.reviewerType].total++;
    if (a.status === "COMPLETED") {
      breakdown[a.reviewerType].completed++;
    }
  });

  // Calculate rates
  Object.values(breakdown).forEach((b) => {
    b.rate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
  });

  return breakdown;
}

export async function getEmployeeDashboardStats(companyUserId: string, companyId: string) {
  // Get pending reviews for this user
  const [
    pendingReviews,
    completedReviews,
    releasedReports,
    pendingNominations,
  ] = await Promise.all([
    prisma.reviewAssignment.count({
      where: {
        reviewerId: companyUserId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        cycle: { companyId, status: "IN_PROGRESS" },
      },
    }),

    prisma.reviewAssignment.count({
      where: {
        reviewerId: companyUserId,
        status: "COMPLETED",
        cycle: { companyId },
      },
    }),

    prisma.cycleParticipant.count({
      where: {
        companyUserId,
        releasedAt: { not: null },
        cycle: { companyId },
      },
    }),

    prisma.cycle.count({
      where: {
        companyId,
        status: "NOMINATION",
        participants: {
          some: { companyUserId },
        },
      },
    }),
  ]);

  return {
    pendingReviews,
    completedReviews,
    releasedReports,
    pendingNominations,
  };
}
