import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendReminderEmail } from "@/lib/email/templates";
import { formatDate } from "@/lib/utils/dates";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is set, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Get all active cycles
    const activeCycles = await prisma.cycle.findMany({
      where: { status: "IN_PROGRESS" },
      include: {
        company: true,
      },
    });

    if (activeCycles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active cycles",
        remindersSent: 0,
      });
    }

    // Get all pending review assignments grouped by reviewer
    const pendingAssignments = await prisma.reviewAssignment.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        cycle: { status: "IN_PROGRESS" },
        reviewerId: { not: null }, // Only internal reviewers
      },
      include: {
        reviewer: {
          include: { user: true },
        },
        cycle: true,
      },
    });

    // Group by reviewer
    const assignmentsByReviewer = pendingAssignments.reduce(
      (acc, assignment) => {
        if (!assignment.reviewerId || !assignment.reviewer) return acc;

        const reviewerId = assignment.reviewerId;
        if (!acc[reviewerId]) {
          acc[reviewerId] = {
            reviewer: assignment.reviewer,
            assignments: [],
            earliestDueDate: assignment.cycle.reviewEndDate,
          };
        }
        acc[reviewerId].assignments.push(assignment);

        // Track earliest due date
        if (assignment.cycle.reviewEndDate < acc[reviewerId].earliestDueDate) {
          acc[reviewerId].earliestDueDate = assignment.cycle.reviewEndDate;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          reviewer: (typeof pendingAssignments)[0]["reviewer"];
          assignments: typeof pendingAssignments;
          earliestDueDate: Date;
        }
      >
    );

    let remindersSent = 0;
    const errors: string[] = [];

    // Send reminders to each reviewer with pending assignments
    for (const [reviewerId, data] of Object.entries(assignmentsByReviewer)) {
      if (!data.reviewer?.user.email) continue;

      const pendingCount = data.assignments.length;

      // Only send reminders for users with pending reviews
      if (pendingCount === 0) continue;

      // Calculate days until earliest deadline
      const daysUntilDeadline = Math.ceil(
        (data.earliestDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Send reminders when:
      // - 7 days before deadline
      // - 3 days before deadline
      // - 1 day before deadline
      // - On deadline day
      // - Every day after deadline
      const shouldSendReminder =
        daysUntilDeadline <= 0 || // Past or on deadline
        daysUntilDeadline === 1 ||
        daysUntilDeadline === 3 ||
        daysUntilDeadline === 7;

      if (!shouldSendReminder) continue;

      try {
        await sendReminderEmail({
          to: data.reviewer.user.email,
          reviewerName: data.reviewer.user.name || "there",
          pendingCount,
          dueDate: formatDate(data.earliestDueDate),
          dashboardUrl: `${APP_URL}/my-reviews`,
        });
        remindersSent++;
      } catch (error) {
        console.error(`Failed to send reminder to ${data.reviewer.user.email}:`, error);
        errors.push(data.reviewer.user.email);
      }
    }

    // Also send reminders for nomination phase
    const nominationCycles = await prisma.cycle.findMany({
      where: { status: "NOMINATION" },
      include: {
        participants: {
          include: {
            companyUser: {
              include: { user: true },
            },
          },
        },
      },
    });

    for (const cycle of nominationCycles) {
      if (!cycle.nominationEndDate) continue;

      const daysUntilDeadline = Math.ceil(
        (cycle.nominationEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const shouldSendReminder =
        daysUntilDeadline <= 0 ||
        daysUntilDeadline === 1 ||
        daysUntilDeadline === 3;

      if (!shouldSendReminder) continue;

      // Check each participant's nomination status
      for (const participant of cycle.participants) {
        const nominationCount = await prisma.nomination.count({
          where: {
            cycleId: cycle.id,
            revieweeId: participant.companyUserId,
            status: { in: ["PENDING", "APPROVED"] },
          },
        });

        // Only remind if they haven't reached minimum
        if (nominationCount >= cycle.minPeers) continue;

        try {
          await sendReminderEmail({
            to: participant.companyUser.user.email,
            reviewerName: participant.companyUser.user.name || "there",
            pendingCount: cycle.minPeers - nominationCount,
            dueDate: formatDate(cycle.nominationEndDate),
            dashboardUrl: `${APP_URL}/nominations/${cycle.id}`,
          });
          remindersSent++;
        } catch (error) {
          console.error(
            `Failed to send nomination reminder to ${participant.companyUser.user.email}:`,
            error
          );
          errors.push(participant.companyUser.user.email);
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}
