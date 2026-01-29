"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { Prisma, type ReviewAssignment, type ReviewResponse } from "@prisma/client";

interface ReviewResponseInput {
  questionId: string;
  ratingValue?: number | null;
  textValue?: string | null;
  selectedOptions?: string[];
}

export async function saveReviewProgress(
  assignmentId: string,
  responses: ReviewResponseInput[]
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser?.companyId;

    // Get assignment and verify access
    const assignment = await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        cycle: { companyId },
        OR: [
          { reviewerId: session.companyUser?.id },
          // Token-based access handled separately
        ],
      },
    });

    if (!assignment) {
      return { success: false, error: "Review assignment not found" };
    }

    if (assignment.status === "COMPLETED") {
      return { success: false, error: "Review already submitted" };
    }

    // Update assignment status and save draft responses
    await prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "IN_PROGRESS",
        startedAt: assignment.startedAt || new Date(),
        lastSavedAt: new Date(),
        draftResponses: responses as unknown as Prisma.InputJsonValue,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save review progress:", error);
    return { success: false, error: "Failed to save progress" };
  }
}

export async function submitReview(
  assignmentId: string,
  responses: ReviewResponseInput[]
): Promise<ActionResult<ReviewAssignment>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser?.companyId;

    // Get assignment and verify access
    const assignment = await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        cycle: { companyId },
        reviewerId: session.companyUser?.id,
      },
      include: {
        cycle: {
          include: {
            template: {
              include: {
                sections: {
                  include: {
                    questions: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return { success: false, error: "Review assignment not found" };
    }

    if (assignment.status === "COMPLETED") {
      return { success: false, error: "Review already submitted" };
    }

    // Get all required questions for this reviewer type
    const requiredQuestions = assignment.cycle.template.sections
      .filter((s) => s.reviewerTypes.includes(assignment.reviewerType))
      .flatMap((s) => s.questions)
      .filter((q) => q.isRequired);

    // Validate all required questions are answered
    const answeredIds = new Set(responses.map((r) => r.questionId));
    const missingRequired = requiredQuestions.filter((q) => !answeredIds.has(q.id));

    if (missingRequired.length > 0) {
      return { success: false, error: "Please answer all required questions" };
    }

    // Save responses and complete assignment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete any existing responses
      await tx.reviewResponse.deleteMany({
        where: { assignmentId },
      });

      // Create new responses
      await tx.reviewResponse.createMany({
        data: responses.map((r) => ({
          assignmentId,
          questionId: r.questionId,
          ratingValue: r.ratingValue,
          textValue: r.textValue,
          selectedOptions: r.selectedOptions || [],
        })),
      });

      // Update assignment status
      const updated = await tx.reviewAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          draftResponses: Prisma.DbNull,
        },
      });

      return updated;
    });

    revalidatePath("/my-reviews");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to submit review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

export async function declineReview(
  assignmentId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser?.companyId;

    // Get assignment and verify access
    const assignment = await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        cycle: { companyId },
        reviewerId: session.companyUser?.id,
      },
    });

    if (!assignment) {
      return { success: false, error: "Review assignment not found" };
    }

    // Only peer reviews can be declined
    if (assignment.reviewerType !== "PEER" && assignment.reviewerType !== "EXTERNAL") {
      return { success: false, error: "This type of review cannot be declined" };
    }

    await prisma.reviewAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "DECLINED",
        declineReason: reason,
      },
    });

    revalidatePath("/my-reviews");
    return { success: true };
  } catch (error) {
    console.error("Failed to decline review:", error);
    return { success: false, error: "Failed to decline review" };
  }
}

// Token-based review submission for external raters
export async function submitTokenReview(
  token: string,
  responses: ReviewResponseInput[]
): Promise<ActionResult> {
  try {
    // Get token and associated assignment
    const reviewToken = await prisma.reviewToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: {
        assignment: {
          include: {
            cycle: {
              include: {
                template: {
                  include: {
                    sections: {
                      include: {
                        questions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!reviewToken || !reviewToken.assignment) {
      return { success: false, error: "Invalid or expired review link" };
    }

    const assignment = reviewToken.assignment;

    if (assignment.status === "COMPLETED") {
      return { success: false, error: "Review already submitted" };
    }

    // Save responses and complete in a transaction
    await prisma.$transaction(async (tx) => {
      // Create responses
      await tx.reviewResponse.createMany({
        data: responses.map((r) => ({
          assignmentId: assignment.id,
          questionId: r.questionId,
          ratingValue: r.ratingValue,
          textValue: r.textValue,
          selectedOptions: r.selectedOptions || [],
        })),
      });

      // Update assignment
      await tx.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Mark token as used
      await tx.reviewToken.update({
        where: { id: reviewToken.id },
        data: { usedAt: new Date() },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit token review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}
