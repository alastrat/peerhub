"use server";

import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";
import { sendPortalMagicLinkEmail } from "@/lib/email/portal-templates";
import type { ActionResult } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ============================================
// Request a magic link for portal access
// ============================================

export async function requestPortalAccess(
  email: string,
  redirectTo?: string,
): Promise<ActionResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    // Find the first active employee with this email
    const employee = await prisma.employee.findFirst({
      where: {
        email: normalizedEmail,
        isActive: true,
      },
    });

    // Always return success to prevent email enumeration
    if (!employee) {
      return { success: true };
    }

    // Create an access token with 24-hour expiry
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.accessToken.create({
      data: {
        token,
        email: normalizedEmail,
        companyId: employee.companyId,
        employeeId: employee.id,
        purpose: "EMPLOYEE_PORTAL",
        expiresAt,
      },
    });

    // Build the magic link URL, optionally including a redirect param
    let magicLinkUrl = `${APP_URL}/portal/verify/${token}`;
    if (redirectTo && redirectTo.startsWith("/portal/")) {
      magicLinkUrl += `?redirect=${encodeURIComponent(redirectTo)}`;
    }

    // Send the magic link email. If delivery fails we still return success
    // (to avoid email enumeration), but we log loudly and mark the token
    // as used so it's not left orphaned.
    try {
      await sendPortalMagicLinkEmail(normalizedEmail, employee.name, magicLinkUrl);
    } catch (emailError) {
      console.error(
        "[portal] Magic link email failed to deliver. The user will see a generic 'check your email' message.",
        { email: normalizedEmail, employeeId: employee.id, emailError },
      );
      await prisma.accessToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to request portal access:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Verify a magic link token
// ============================================

export async function verifyPortalToken(
  token: string
): Promise<
  ActionResult<{ employeeId: string; companyId: string; email: string }>
> {
  try {
    const accessToken = await prisma.accessToken.findFirst({
      where: {
        token,
        purpose: "EMPLOYEE_PORTAL",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        employee: true,
      },
    });

    if (!accessToken || !accessToken.employee) {
      return {
        success: false,
        error: "Invalid or expired link. Please request a new one.",
      };
    }

    // Mark the token as used
    await prisma.accessToken.update({
      where: { id: accessToken.id },
      data: { usedAt: new Date() },
    });

    return {
      success: true,
      data: {
        employeeId: accessToken.employee.id,
        companyId: accessToken.companyId,
        email: accessToken.email,
      },
    };
  } catch (error) {
    console.error("Failed to verify portal token:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Get portal dashboard data
// ============================================

export async function getPortalDashboard(employeeId: string): Promise<{
  pendingReviews: Array<{
    id: string;
    revieweeName: string;
    reviewerType: string;
    cycleName: string;
    dueDate: string;
  }>;
  pendingNominations: Array<{
    cycleId: string;
    cycleName: string;
    minPeers: number;
    maxPeers: number;
  }>;
  pendingClimateSurveys: Array<{
    distributionId: string;
    surveyName: string;
    surveyType: string;
    dueDate: string;
    isAnonymous: boolean;
  }>;
  releasedReports: Array<{
    cycleId: string;
    cycleName: string;
    releasedAt: string;
  }>;
}> {
  // Pending reviews: assignments where this employee is the reviewer and status is PENDING or IN_PROGRESS
  const pendingAssignments = await prisma.reviewAssignment.findMany({
    where: {
      reviewerId: employeeId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    include: {
      reviewee: { select: { name: true } },
      cycle: { select: { name: true, reviewEndDate: true } },
    },
    orderBy: { cycle: { reviewEndDate: "asc" } },
  });

  const pendingReviews = pendingAssignments.map((a) => ({
    id: a.id,
    revieweeName: a.reviewee.name,
    reviewerType: a.reviewerType,
    cycleName: a.cycle.name,
    dueDate: a.cycle.reviewEndDate.toISOString(),
  }));

  // Pending nominations: cycles in NOMINATION status where this employee is a participant
  const nominationParticipants = await prisma.cycleParticipant.findMany({
    where: {
      employeeId,
      cycle: { status: "NOMINATION" },
    },
    include: {
      cycle: {
        select: {
          id: true,
          name: true,
          minPeers: true,
          maxPeers: true,
        },
      },
    },
  });

  const pendingNominations = nominationParticipants.map((p) => ({
    cycleId: p.cycle.id,
    cycleName: p.cycle.name,
    minPeers: p.cycle.minPeers,
    maxPeers: p.cycle.maxPeers,
  }));

  // Released reports: cycle participations where releasedAt is set
  const releasedParticipants = await prisma.cycleParticipant.findMany({
    where: {
      employeeId,
      releasedAt: { not: null },
    },
    include: {
      cycle: { select: { id: true, name: true } },
    },
    orderBy: { releasedAt: "desc" },
  });

  const releasedReports = releasedParticipants.map((p) => ({
    cycleId: p.cycle.id,
    cycleName: p.cycle.name,
    releasedAt: p.releasedAt!.toISOString(),
  }));

  // Pending climate surveys: active distributions targeting this employee without a completed response
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      companyId: true,
      departmentId: true,
      hubId: true,
      teamMemberships: { select: { teamId: true } },
    },
  });

  let pendingClimateSurveys: Array<{
    distributionId: string;
    surveyName: string;
    surveyType: string;
    dueDate: string;
    isAnonymous: boolean;
  }> = [];

  if (employee) {
    const teamIds = employee.teamMemberships.map((m) => m.teamId);
    const targetFilters: Array<Record<string, unknown>> = [{ targetType: "ALL" }];
    if (employee.departmentId) {
      targetFilters.push({ targetType: "DEPARTMENT", targetIds: { has: employee.departmentId } });
    }
    if (employee.hubId) {
      targetFilters.push({ targetType: "HUB", targetIds: { has: employee.hubId } });
    }
    if (teamIds.length > 0) {
      targetFilters.push({ targetType: "TEAM", targetIds: { hasSome: teamIds } });
    }
    targetFilters.push({ targetType: "CUSTOM", targetIds: { has: employeeId } });

    const climateDistributions = await prisma.surveyDistribution.findMany({
      where: {
        survey: { status: "ACTIVE", companyId: employee.companyId },
        OR: targetFilters,
        NOT: {
          responses: { some: { employeeId, isComplete: true } },
        },
      },
      include: {
        survey: {
          select: { id: true, name: true, type: true, isAnonymous: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    pendingClimateSurveys = climateDistributions.map((d) => ({
      distributionId: d.id,
      surveyName: d.survey.name,
      surveyType: d.survey.type,
      dueDate: d.dueDate.toISOString(),
      isAnonymous: d.survey.isAnonymous,
    }));
  }

  return {
    pendingReviews,
    pendingNominations,
    pendingClimateSurveys,
    releasedReports,
  };
}
