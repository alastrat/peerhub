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
  email: string
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

    // Send the magic link email
    const magicLinkUrl = `${APP_URL}/portal/verify/${token}`;
    await sendPortalMagicLinkEmail(normalizedEmail, employee.name, magicLinkUrl);

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

  return { pendingReviews, pendingNominations, releasedReports };
}
