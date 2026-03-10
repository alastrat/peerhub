"use server";

import { prisma } from "@/lib/db/prisma";
import { getPortalSession } from "@/lib/auth/portal-session";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { Prisma } from "@prisma/client";

interface ReviewResponseInput {
  questionId: string;
  ratingValue?: number | null;
  textValue?: string | null;
  selectedOptions?: string[];
}

export async function savePortalReviewProgress(
  assignmentId: string,
  responses: ReviewResponseInput[]
): Promise<ActionResult> {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get assignment and verify the portal user is the reviewer
    const assignment = await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        reviewerId: session.employeeId,
      },
    });

    if (!assignment) {
      return { success: false, error: "Review assignment not found" };
    }

    if (assignment.status === "COMPLETED") {
      return { success: false, error: "Review already submitted" };
    }

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
    console.error("Failed to save portal review progress:", error);
    return { success: false, error: "Failed to save progress" };
  }
}

export async function submitPortalReview(
  assignmentId: string,
  responses: ReviewResponseInput[]
): Promise<ActionResult> {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get assignment and verify access
    const assignment = await prisma.reviewAssignment.findFirst({
      where: {
        id: assignmentId,
        reviewerId: session.employeeId,
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

    // Validate required questions
    const requiredQuestions = assignment.cycle.template.sections
      .filter((s) => s.reviewerTypes.includes(assignment.reviewerType))
      .flatMap((s) => s.questions)
      .filter((q) => q.isRequired);

    const answeredIds = new Set(responses.map((r) => r.questionId));
    const missingRequired = requiredQuestions.filter(
      (q) => !answeredIds.has(q.id)
    );

    if (missingRequired.length > 0) {
      return { success: false, error: "Please answer all required questions" };
    }

    // Save responses and complete assignment in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.reviewResponse.deleteMany({
        where: { assignmentId },
      });

      await tx.reviewResponse.createMany({
        data: responses.map((r) => ({
          assignmentId,
          questionId: r.questionId,
          ratingValue: r.ratingValue,
          textValue: r.textValue,
          selectedOptions: r.selectedOptions || [],
        })),
      });

      await tx.reviewAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          draftResponses: Prisma.DbNull,
        },
      });
    });

    revalidatePath("/portal/home");
    return { success: true };
  } catch (error) {
    console.error("Failed to submit portal review:", error);
    return { success: false, error: "Failed to submit review" };
  }
}
