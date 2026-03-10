"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Cycle, CycleStatus } from "@prisma/client";
import { sendReviewRequestEmail, sendNominationRequestEmail } from "@/lib/email/templates";
import { formatDate } from "@/lib/utils/dates";
import { notifyEmployee } from "@/lib/utils/notify-employee";

interface CreateCycleInput {
  name: string;
  description?: string;
  templateId: string;
  reviewStartDate: Date;
  reviewEndDate: Date;
  nominationStartDate?: Date;
  nominationEndDate?: Date;
  selfReviewEnabled?: boolean;
  managerReviewEnabled?: boolean;
  peerReviewEnabled?: boolean;
  directReportEnabled?: boolean;
  externalEnabled?: boolean;
  minPeers?: number;
  maxPeers?: number;
  anonymityThreshold?: number;
  employeeNominatePeers?: boolean;
  managerApprovePeers?: boolean;
  participantIds?: string[];
}

export async function createCycle(
  input: CreateCycleInput
): Promise<ActionResult<Cycle>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify template belongs to company
    const template = await prisma.template.findFirst({
      where: { id: input.templateId, companyId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const cycle = await prisma.cycle.create({
      data: {
        name: input.name,
        description: input.description,
        companyId,
        templateId: input.templateId,
        reviewStartDate: input.reviewStartDate,
        reviewEndDate: input.reviewEndDate,
        nominationStartDate: input.nominationStartDate,
        nominationEndDate: input.nominationEndDate,
        selfReviewEnabled: input.selfReviewEnabled ?? true,
        managerReviewEnabled: input.managerReviewEnabled ?? true,
        peerReviewEnabled: input.peerReviewEnabled ?? true,
        directReportEnabled: input.directReportEnabled ?? false,
        externalEnabled: input.externalEnabled ?? false,
        minPeers: input.minPeers ?? 3,
        maxPeers: input.maxPeers ?? 8,
        anonymityThreshold: input.anonymityThreshold ?? 3,
        employeeNominatePeers: input.employeeNominatePeers ?? true,
        managerApprovePeers: input.managerApprovePeers ?? true,
        status: "DRAFT",
      },
    });

    // Add participants if provided (participantIds are now employee IDs)
    if (input.participantIds?.length) {
      await prisma.cycleParticipant.createMany({
        data: input.participantIds.map((employeeId) => ({
          cycleId: cycle.id,
          employeeId,
        })),
      });
    }

    revalidatePath("/cycles");
    return { success: true, data: cycle };
  } catch (error) {
    console.error("Failed to create cycle:", error);
    return { success: false, error: "Failed to create cycle" };
  }
}

export async function updateCycle(
  cycleId: string,
  data: Partial<CreateCycleInput>
): Promise<ActionResult<Cycle>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify cycle belongs to company and is still in DRAFT
    const existing = await prisma.cycle.findFirst({
      where: { id: cycleId, companyId },
    });

    if (!existing) {
      return { success: false, error: "Cycle not found" };
    }

    if (existing.status !== "DRAFT") {
      return { success: false, error: "Can only edit draft cycles" };
    }

    const cycle = await prisma.cycle.update({
      where: { id: cycleId },
      data: {
        name: data.name,
        description: data.description,
        reviewStartDate: data.reviewStartDate,
        reviewEndDate: data.reviewEndDate,
        nominationStartDate: data.nominationStartDate,
        nominationEndDate: data.nominationEndDate,
        selfReviewEnabled: data.selfReviewEnabled,
        managerReviewEnabled: data.managerReviewEnabled,
        peerReviewEnabled: data.peerReviewEnabled,
        directReportEnabled: data.directReportEnabled,
        externalEnabled: data.externalEnabled,
        minPeers: data.minPeers,
        maxPeers: data.maxPeers,
        anonymityThreshold: data.anonymityThreshold,
        employeeNominatePeers: data.employeeNominatePeers,
        managerApprovePeers: data.managerApprovePeers,
      },
    });

    revalidatePath("/cycles");
    return { success: true, data: cycle };
  } catch (error) {
    console.error("Failed to update cycle:", error);
    return { success: false, error: "Failed to update cycle" };
  }
}

export async function addParticipants(
  cycleId: string,
  userIds: string[]
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify cycle belongs to company
    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, companyId },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    // Filter out already added participants (userIds are now employee IDs)
    const existing = await prisma.cycleParticipant.findMany({
      where: {
        cycleId,
        employeeId: { in: userIds },
      },
      select: { employeeId: true },
    });

    const existingIds = new Set(existing.map((p) => p.employeeId));
    const newIds = userIds.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      await prisma.cycleParticipant.createMany({
        data: newIds.map((employeeId) => ({
          cycleId,
          employeeId,
        })),
      });
    }

    revalidatePath(`/cycles/${cycleId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to add participants:", error);
    return { success: false, error: "Failed to add participants" };
  }
}

export async function launchCycle(
  cycleId: string,
  sendEmails: boolean = true
): Promise<ActionResult<Cycle>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Get cycle with participants
    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, companyId },
      include: {
        participants: {
          include: {
            employee: {
              include: {
                manager: true,
                directReports: true,
              },
            },
          },
        },
        template: true,
      },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    if (cycle.status !== "DRAFT") {
      return { success: false, error: "Cycle already launched" };
    }

    if (cycle.participants.length === 0) {
      return { success: false, error: "Add participants before launching" };
    }

    // Create review assignments
    const assignments: {
      cycleId: string;
      reviewerId: string | null;
      revieweeId: string;
      reviewerType: "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT" | "EXTERNAL";
    }[] = [];

    for (const participant of cycle.participants) {
      const employee = participant.employee;

      // Self review
      if (cycle.selfReviewEnabled) {
        assignments.push({
          cycleId: cycle.id,
          reviewerId: employee.id,
          revieweeId: employee.id,
          reviewerType: "SELF",
        });
      }

      // Manager review
      if (cycle.managerReviewEnabled && employee.managerId) {
        assignments.push({
          cycleId: cycle.id,
          reviewerId: employee.managerId,
          revieweeId: employee.id,
          reviewerType: "MANAGER",
        });
      }

      // Direct reports review
      if (cycle.directReportEnabled && employee.directReports.length > 0) {
        for (const report of employee.directReports) {
          assignments.push({
            cycleId: cycle.id,
            reviewerId: report.id,
            revieweeId: employee.id,
            reviewerType: "DIRECT_REPORT",
          });
        }
      }
    }

    // Create assignments
    await prisma.reviewAssignment.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    // Determine next status
    const nextStatus: CycleStatus = cycle.peerReviewEnabled ? "NOMINATION" : "IN_PROGRESS";

    // Update cycle status
    const updatedCycle = await prisma.cycle.update({
      where: { id: cycleId },
      data: { status: nextStatus },
    });

    // Send emails
    if (sendEmails) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      if (nextStatus === "NOMINATION") {
        // Send nomination request emails to all participants
        for (const participant of cycle.participants) {
          const employee = participant.employee;
          try {
            await notifyEmployee({
              employeeId: employee.id,
              subject: `Nominate your peer reviewers for "${cycle.name}"`,
              dashboardUrl: `/nominations/${cycle.id}`,
              sendMemberEmail: async (email, name, url) => {
                await sendNominationRequestEmail({
                  to: email,
                  employeeName: name || "there",
                  cycleName: cycle.name,
                  minPeers: cycle.minPeers,
                  maxPeers: cycle.maxPeers,
                  dueDate: cycle.nominationEndDate
                    ? formatDate(cycle.nominationEndDate)
                    : formatDate(cycle.reviewStartDate),
                  nominationUrl: url,
                });
              },
            });
          } catch (emailError) {
            console.error("Failed to send nomination email:", emailError);
          }
        }
      } else {
        // Send review request emails to all reviewers with assignments
        const uniqueReviewerIds = [...new Set(assignments.map((a) => a.reviewerId).filter(Boolean))];

        for (const reviewerId of uniqueReviewerIds) {
          const reviewer = cycle.participants.find(
            (p) => p.employeeId === reviewerId
          )?.employee;

          if (reviewer) {
            const reviewerAssignments = assignments.filter((a) => a.reviewerId === reviewerId);
            for (const assignment of reviewerAssignments) {
              const reviewee = cycle.participants.find(
                (p) => p.employeeId === assignment.revieweeId
              )?.employee;

              if (reviewee) {
                try {
                  await notifyEmployee({
                    employeeId: reviewer.id,
                    subject: `Feedback requested for ${
                      assignment.reviewerType === "SELF"
                        ? "yourself"
                        : reviewee.name || reviewee.email
                    }`,
                    dashboardUrl: `/my-reviews`,
                    sendMemberEmail: async (email, name, url) => {
                      await sendReviewRequestEmail({
                        to: email,
                        reviewerName: name || "there",
                        revieweeName: assignment.reviewerType === "SELF"
                          ? "yourself"
                          : reviewee.name || reviewee.email,
                        cycleName: cycle.name,
                        dueDate: formatDate(cycle.reviewEndDate),
                        reviewUrl: url,
                      });
                    },
                  });
                } catch (emailError) {
                  console.error("Failed to send review request email:", emailError);
                }
              }
            }
          }
        }
      }
    }

    revalidatePath("/cycles");
    return { success: true, data: updatedCycle };
  } catch (error) {
    console.error("Failed to launch cycle:", error);
    return { success: false, error: "Failed to launch cycle" };
  }
}

export async function closeCycle(cycleId: string): Promise<ActionResult<Cycle>> {
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

    const updatedCycle = await prisma.cycle.update({
      where: { id: cycleId },
      data: { status: "CLOSED" },
    });

    revalidatePath("/cycles");
    return { success: true, data: updatedCycle };
  } catch (error) {
    console.error("Failed to close cycle:", error);
    return { success: false, error: "Failed to close cycle" };
  }
}

import { generateReviewToken } from "@/lib/utils/tokens";
import { sendExternalReviewRequestEmail } from "@/lib/email/templates";

interface AddExternalRaterInput {
  email: string;
  name: string;
  revieweeId: string;
}

export async function addExternalRater(
  cycleId: string,
  input: AddExternalRaterInput
): Promise<ActionResult<{ tokenUrl: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Verify cycle exists and external raters are enabled
    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, companyId },
      include: {
        company: true,
        participants: {
          where: { employeeId: input.revieweeId },
          include: {
            employee: true,
          },
        },
      },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    if (!cycle.externalEnabled) {
      return { success: false, error: "External raters not enabled for this cycle" };
    }

    if (cycle.status !== "IN_PROGRESS" && cycle.status !== "NOMINATION") {
      return { success: false, error: "Cycle is not active" };
    }

    if (cycle.participants.length === 0) {
      return { success: false, error: "Reviewee is not a participant in this cycle" };
    }

    const reviewee = cycle.participants[0].employee;

    // Check if this email already has a token for this cycle/reviewee
    const existingToken = await prisma.reviewToken.findFirst({
      where: {
        email: input.email,
        assignment: {
          cycleId,
          revieweeId: input.revieweeId,
          reviewerType: "EXTERNAL",
        },
      },
    });

    if (existingToken) {
      return { success: false, error: "This email has already been invited to review this employee" };
    }

    // Generate token
    const token = generateReviewToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Token expires in 30 days

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create review token
      const reviewToken = await tx.reviewToken.create({
        data: {
          token,
          email: input.email,
          name: input.name,
          companyId,
          expiresAt,
        },
      });

      // Create review assignment
      await tx.reviewAssignment.create({
        data: {
          cycleId,
          revieweeId: input.revieweeId,
          reviewerType: "EXTERNAL",
          externalEmail: input.email,
          externalName: input.name,
          tokenId: reviewToken.id,
        },
      });

      return reviewToken;
    });

    const tokenUrl = `${APP_URL}/review/${token}`;

    // Send email
    try {
      await sendExternalReviewRequestEmail({
        to: input.email,
        reviewerName: input.name,
        revieweeName: reviewee.name || reviewee.email,
        companyName: cycle.company.name,
        cycleName: cycle.name,
        dueDate: formatDate(cycle.reviewEndDate),
        reviewUrl: tokenUrl,
      });
    } catch (emailError) {
      console.error("Failed to send external rater email:", emailError);
      // Don't fail the action if email fails, token is still created
    }

    revalidatePath(`/cycles/${cycleId}`);
    return { success: true, data: { tokenUrl } };
  } catch (error) {
    console.error("Failed to add external rater:", error);
    return { success: false, error: "Failed to add external rater" };
  }
}
