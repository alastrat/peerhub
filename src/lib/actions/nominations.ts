"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Nomination, NominationStatus } from "@prisma/client";

interface CreateNominationInput {
  cycleId: string;
  nomineeId: string;
  revieweeId?: string; // If not provided, defaults to nominator (self-nomination for peer review)
}

export async function createNomination(
  input: CreateNominationInput
): Promise<ActionResult<Nomination>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.companyUser) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;
    const nominatorId = session.companyUser.id;

    // Verify cycle exists and is in nomination phase
    const cycle = await prisma.cycle.findFirst({
      where: { id: input.cycleId, companyId },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    if (cycle.status !== "NOMINATION") {
      return { success: false, error: "Cycle is not in nomination phase" };
    }

    // Determine reviewee (who is being reviewed)
    const revieweeId = input.revieweeId || nominatorId;

    // Verify participant is in the cycle
    const participant = await prisma.cycleParticipant.findFirst({
      where: {
        cycleId: input.cycleId,
        companyUserId: revieweeId,
      },
    });

    if (!participant) {
      return { success: false, error: "Participant not in cycle" };
    }

    // Check if nominee exists and is in the same company
    const nominee = await prisma.companyUser.findFirst({
      where: {
        id: input.nomineeId,
        companyId,
        isActive: true,
      },
    });

    if (!nominee) {
      return { success: false, error: "Nominee not found" };
    }

    // Can't nominate yourself for your own review
    if (input.nomineeId === revieweeId) {
      return { success: false, error: "Cannot nominate yourself for your own review" };
    }

    // Check current nomination count
    const existingCount = await prisma.nomination.count({
      where: {
        cycleId: input.cycleId,
        revieweeId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingCount >= cycle.maxPeers) {
      return { success: false, error: `Maximum ${cycle.maxPeers} peer nominations allowed` };
    }

    // Check for duplicate nomination
    const existing = await prisma.nomination.findFirst({
      where: {
        cycleId: input.cycleId,
        nomineeId: input.nomineeId,
        revieweeId,
      },
    });

    if (existing) {
      return { success: false, error: "This person has already been nominated" };
    }

    // Create nomination
    const nomination = await prisma.nomination.create({
      data: {
        cycleId: input.cycleId,
        nominatorId,
        nomineeId: input.nomineeId,
        revieweeId,
        reviewerType: "PEER",
        status: cycle.managerApprovePeers ? "PENDING" : "APPROVED",
      },
    });

    // If auto-approved, create the review assignment
    if (!cycle.managerApprovePeers) {
      await prisma.reviewAssignment.create({
        data: {
          cycleId: input.cycleId,
          reviewerId: input.nomineeId,
          revieweeId,
          reviewerType: "PEER",
        },
      });
    }

    revalidatePath(`/nominations/${input.cycleId}`);
    return { success: true, data: nomination };
  } catch (error) {
    console.error("Failed to create nomination:", error);
    return { success: false, error: "Failed to create nomination" };
  }
}

export async function createNominations(
  cycleId: string,
  nomineeIds: string[],
  revieweeId?: string
): Promise<ActionResult<{ created: number; skipped: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.companyUser) {
      return { success: false, error: "Unauthorized" };
    }

    let created = 0;
    let skipped = 0;

    for (const nomineeId of nomineeIds) {
      const result = await createNomination({
        cycleId,
        nomineeId,
        revieweeId,
      });

      if (result.success) {
        created++;
      } else {
        skipped++;
      }
    }

    return { success: true, data: { created, skipped } };
  } catch (error) {
    console.error("Failed to create nominations:", error);
    return { success: false, error: "Failed to create nominations" };
  }
}

export async function removeNomination(
  nominationId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.companyUser) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Get nomination and verify access
    const nomination = await prisma.nomination.findFirst({
      where: {
        id: nominationId,
        cycle: { companyId },
      },
      include: { cycle: true },
    });

    if (!nomination) {
      return { success: false, error: "Nomination not found" };
    }

    // Only the nominator or admin can remove
    const isAdmin = session.companyUser.role === "ADMIN";
    const isNominator = nomination.nominatorId === session.companyUser.id;

    if (!isAdmin && !isNominator) {
      return { success: false, error: "Unauthorized" };
    }

    if (nomination.status === "APPROVED") {
      // Also delete the review assignment if it exists
      await prisma.reviewAssignment.deleteMany({
        where: {
          cycleId: nomination.cycleId,
          reviewerId: nomination.nomineeId,
          revieweeId: nomination.revieweeId,
          reviewerType: "PEER",
        },
      });
    }

    await prisma.nomination.delete({
      where: { id: nominationId },
    });

    revalidatePath(`/nominations/${nomination.cycleId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove nomination:", error);
    return { success: false, error: "Failed to remove nomination" };
  }
}

export async function approveNomination(
  nominationId: string
): Promise<ActionResult<Nomination>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.companyUser) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;
    const role = session.companyUser.role;

    // Only admins and managers can approve
    if (role !== "ADMIN" && role !== "MANAGER") {
      return { success: false, error: "Unauthorized" };
    }

    const nomination = await prisma.nomination.findFirst({
      where: {
        id: nominationId,
        cycle: { companyId },
      },
      include: {
        reviewee: {
          include: { user: true },
        },
        cycle: true,
      },
    });

    if (!nomination) {
      return { success: false, error: "Nomination not found" };
    }

    if (nomination.status !== "PENDING") {
      return { success: false, error: "Nomination is not pending" };
    }

    // Managers can only approve for their direct reports
    if (role === "MANAGER") {
      const isDirectReport = nomination.reviewee.managerId === session.companyUser.id;
      if (!isDirectReport) {
        return { success: false, error: "You can only approve nominations for your direct reports" };
      }
    }

    // Update nomination status
    const updated = await prisma.nomination.update({
      where: { id: nominationId },
      data: { status: "APPROVED" },
    });

    // Create review assignment
    await prisma.reviewAssignment.create({
      data: {
        cycleId: nomination.cycleId,
        reviewerId: nomination.nomineeId,
        revieweeId: nomination.revieweeId,
        reviewerType: "PEER",
      },
    });

    revalidatePath(`/nominations/${nomination.cycleId}`);
    revalidatePath(`/nominations/${nomination.cycleId}/approve`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to approve nomination:", error);
    return { success: false, error: "Failed to approve nomination" };
  }
}

export async function rejectNomination(
  nominationId: string,
  reason?: string
): Promise<ActionResult<Nomination>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.companyUser) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;
    const role = session.companyUser.role;

    if (role !== "ADMIN" && role !== "MANAGER") {
      return { success: false, error: "Unauthorized" };
    }

    const nomination = await prisma.nomination.findFirst({
      where: {
        id: nominationId,
        cycle: { companyId },
      },
      include: {
        reviewee: true,
      },
    });

    if (!nomination) {
      return { success: false, error: "Nomination not found" };
    }

    if (nomination.status !== "PENDING") {
      return { success: false, error: "Nomination is not pending" };
    }

    // Managers can only reject for their direct reports
    if (role === "MANAGER") {
      const isDirectReport = nomination.reviewee.managerId === session.companyUser.id;
      if (!isDirectReport) {
        return { success: false, error: "You can only reject nominations for your direct reports" };
      }
    }

    const updated = await prisma.nomination.update({
      where: { id: nominationId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
      },
    });

    revalidatePath(`/nominations/${nomination.cycleId}`);
    revalidatePath(`/nominations/${nomination.cycleId}/approve`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to reject nomination:", error);
    return { success: false, error: "Failed to reject nomination" };
  }
}

export async function bulkApproveNominations(
  nominationIds: string[]
): Promise<ActionResult<{ approved: number; failed: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.companyUser) {
      return { success: false, error: "Unauthorized" };
    }

    const role = session.companyUser.role;
    if (role !== "ADMIN" && role !== "MANAGER") {
      return { success: false, error: "Unauthorized" };
    }

    let approved = 0;
    let failed = 0;

    for (const id of nominationIds) {
      const result = await approveNomination(id);
      if (result.success) {
        approved++;
      } else {
        failed++;
      }
    }

    return { success: true, data: { approved, failed } };
  } catch (error) {
    console.error("Failed to bulk approve nominations:", error);
    return { success: false, error: "Failed to approve nominations" };
  }
}

export async function transitionToInProgress(
  cycleId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, companyId },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    if (cycle.status !== "NOMINATION") {
      return { success: false, error: "Cycle is not in nomination phase" };
    }

    // Check if there are pending nominations
    const pendingCount = await prisma.nomination.count({
      where: {
        cycleId,
        status: "PENDING",
      },
    });

    if (pendingCount > 0) {
      return {
        success: false,
        error: `${pendingCount} nominations still pending approval`,
      };
    }

    // Update cycle status
    await prisma.cycle.update({
      where: { id: cycleId },
      data: { status: "IN_PROGRESS" },
    });

    revalidatePath("/cycles");
    revalidatePath(`/cycles/${cycleId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to transition cycle:", error);
    return { success: false, error: "Failed to transition cycle" };
  }
}

// Query functions
export async function getNominationsForCycle(
  cycleId: string,
  revieweeId?: string
) {
  const session = await auth();
  if (!session?.companyUser) {
    return [];
  }

  const where: Record<string, unknown> = {
    cycleId,
    cycle: { companyId: session.companyUser.companyId },
  };

  if (revieweeId) {
    where.revieweeId = revieweeId;
  }

  return prisma.nomination.findMany({
    where,
    include: {
      nominator: { include: { user: true } },
      nominee: { include: { user: true } },
      reviewee: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNominationStats(cycleId: string, revieweeId: string) {
  const session = await auth();
  if (!session?.companyUser) {
    return null;
  }

  const cycle = await prisma.cycle.findFirst({
    where: {
      id: cycleId,
      companyId: session.companyUser.companyId,
    },
  });

  if (!cycle) return null;

  const nominations = await prisma.nomination.findMany({
    where: { cycleId, revieweeId },
  });

  const approved = nominations.filter((n) => n.status === "APPROVED").length;
  const pending = nominations.filter((n) => n.status === "PENDING").length;
  const rejected = nominations.filter((n) => n.status === "REJECTED").length;

  return {
    total: nominations.length,
    approved,
    pending,
    rejected,
    minRequired: cycle.minPeers,
    maxAllowed: cycle.maxPeers,
    needsMore: approved < cycle.minPeers,
    canAddMore: nominations.length - rejected < cycle.maxPeers,
  };
}
