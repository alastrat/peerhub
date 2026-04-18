"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { sendReportReleasedEmail } from "@/lib/email/templates";
import { getEmployeeReport, getCycleReportSummary } from "@/lib/queries/reports";
import { notifyEmployee } from "@/lib/utils/notify-employee";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function releaseReport(
  cycleId: string,
  participantId: string,
  sendEmail: boolean = true
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Verify cycle and participant belong to company
    const participant = await prisma.cycleParticipant.findFirst({
      where: {
        cycleId,
        employeeId: participantId,
        cycle: { companyId },
      },
      include: {
        employee: true,
        cycle: true,
      },
    });

    if (!participant) {
      return { success: false, error: "Participant not found" };
    }

    if (participant.releasedAt) {
      return { success: false, error: "Report already released" };
    }

    // Check if participant has minimum responses
    const completedAssignments = await prisma.reviewAssignment.count({
      where: {
        cycleId,
        revieweeId: participantId,
        status: "COMPLETED",
      },
    });

    if (completedAssignments < participant.cycle.anonymityThreshold) {
      return {
        success: false,
        error: `Minimum ${participant.cycle.anonymityThreshold} completed reviews required`,
      };
    }

    // Release the report
    await prisma.cycleParticipant.update({
      where: { id: participant.id },
      data: { releasedAt: new Date() },
    });

    // Send email notification
    let warning: string | undefined;
    if (sendEmail) {
      try {
        await notifyEmployee({
          employeeId: participant.employeeId,
          subject: `Your feedback report for "${participant.cycle.name}" is ready`,
          dashboardUrl: `/my-feedback/${cycleId}`,
          sendMemberEmail: async (email, name, url) => {
            await sendReportReleasedEmail({
              to: email,
              employeeName: name || "there",
              cycleName: participant.cycle.name,
              reportUrl: url,
            });
          },
        });
      } catch (emailError) {
        console.error(
          `[reports] Report release email failed for employee ${participant.employeeId}:`,
          emailError,
        );
        warning = "Report was released but the notification email could not be delivered. Check the server logs.";
      }
    }

    revalidatePath(`/reports/${cycleId}`);
    revalidatePath("/my-feedback");
    return { success: true, warning };
  } catch (error) {
    console.error("Failed to release report:", error);
    return { success: false, error: "Failed to release report" };
  }
}

export async function releaseAllReports(
  cycleId: string,
  sendEmails: boolean = true
): Promise<ActionResult<{ released: number; skipped: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    // Get cycle with participants and their assignment counts
    const cycle = await prisma.cycle.findFirst({
      where: { id: cycleId, companyId },
      include: {
        participants: {
          where: { releasedAt: null },
          include: {
            employee: true,
          },
        },
      },
    });

    if (!cycle) {
      return { success: false, error: "Cycle not found" };
    }

    let released = 0;
    let skipped = 0;
    let emailFailures = 0;

    for (const participant of cycle.participants) {
      // Check if participant has minimum responses
      const completedCount = await prisma.reviewAssignment.count({
        where: {
          cycleId,
          revieweeId: participant.employeeId,
          status: "COMPLETED",
        },
      });

      if (completedCount >= cycle.anonymityThreshold) {
        // Release the report
        await prisma.cycleParticipant.update({
          where: { id: participant.id },
          data: { releasedAt: new Date() },
        });

        released++;

        // Send email notification
        if (sendEmails) {
          try {
            await notifyEmployee({
              employeeId: participant.employeeId,
              subject: `Your feedback report for "${cycle.name}" is ready`,
              dashboardUrl: `/my-feedback/${cycleId}`,
              sendMemberEmail: async (email, name, url) => {
                await sendReportReleasedEmail({
                  to: email,
                  employeeName: name || "there",
                  cycleName: cycle.name,
                  reportUrl: url,
                });
              },
            });
          } catch (emailError) {
            emailFailures++;
            console.error(
              `[reports] Bulk release email failed for employee ${participant.employeeId}:`,
              emailError,
            );
          }
        }
      } else {
        skipped++;
      }
    }

    revalidatePath(`/reports/${cycleId}`);
    revalidatePath("/my-feedback");
    const warning =
      emailFailures > 0
        ? `${emailFailures} notification email${emailFailures !== 1 ? "s" : ""} failed to send. Reports were released but affected employees won't be notified by email. Check the server logs.`
        : undefined;
    return { success: true, data: { released, skipped }, warning };
  } catch (error) {
    console.error("Failed to release all reports:", error);
    return { success: false, error: "Failed to release reports" };
  }
}

export async function exportReportCSV(
  cycleId: string,
  participantId?: string
): Promise<ActionResult<string>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    if (participantId) {
      // Export single participant report
      const report = await getEmployeeReport({
        cycleId,
        companyId,
        employeeId: participantId,
      });

      if (!report) {
        return { success: false, error: "Report not found" };
      }

      const rows: string[] = [];
      rows.push("Section,Question,Reviewer Type,Average Rating,Response Count");

      report.sections.forEach((section) => {
        section.questions.forEach((question) => {
          Object.entries(question.byReviewerType).forEach(([type, result]) => {
            if (result.isVisible && result.rating) {
              rows.push(
                `"${section.sectionTitle}","${question.questionText}","${type}",${result.rating.average},${result.rating.count}`
              );
            }
          });
        });
      });

      return { success: true, data: rows.join("\n") };
    } else {
      // Export cycle summary
      const summary = await getCycleReportSummary({ cycleId, companyId });

      if (!summary) {
        return { success: false, error: "Cycle not found" };
      }

      const rows: string[] = [];
      rows.push("Participant,Email,Completed Reviews,Total Reviews,Released");

      summary.participants.forEach((p) => {
        rows.push(
          `"${p.participantName}","${p.email}",${p.completedReviews},${p.totalReviews},${p.releasedAt ? "Yes" : "No"}`
        );
      });

      return { success: true, data: rows.join("\n") };
    }
  } catch (error) {
    console.error("Failed to export report:", error);
    return { success: false, error: "Failed to export report" };
  }
}

export async function unreleaseReport(
  cycleId: string,
  participantId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.companyUser?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const companyId = session.companyUser.companyId;

    const participant = await prisma.cycleParticipant.findFirst({
      where: {
        cycleId,
        employeeId: participantId,
        cycle: { companyId },
      },
    });

    if (!participant) {
      return { success: false, error: "Participant not found" };
    }

    if (!participant.releasedAt) {
      return { success: false, error: "Report not released" };
    }

    await prisma.cycleParticipant.update({
      where: { id: participant.id },
      data: { releasedAt: null },
    });

    revalidatePath(`/reports/${cycleId}`);
    revalidatePath("/my-feedback");
    return { success: true };
  } catch (error) {
    console.error("Failed to unrelease report:", error);
    return { success: false, error: "Failed to unrelease report" };
  }
}
