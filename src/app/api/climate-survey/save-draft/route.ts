import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPortalSession } from "@/lib/auth/portal-session";
import { auth } from "@/lib/auth/config";

/**
 * Beacon-friendly endpoint for saving survey draft answers.
 * Called by navigator.sendBeacon on page unload as a last-resort save,
 * and can also be called by regular fetch.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { distributionId, answers } = body as {
      distributionId: string;
      answers: { questionId: string; ratingValue?: number; textValue?: string }[];
    };

    if (!distributionId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Resolve the employee — try portal session first, then dashboard auth
    let employeeId: string | null = null;

    const portalSession = await getPortalSession();
    if (portalSession) {
      employeeId = portalSession.employeeId;
    } else {
      const session = await auth();
      if (session?.user?.id && session.companyUser?.companyId) {
        const companyUser = await prisma.companyUser.findFirst({
          where: {
            userId: session.user.id,
            companyId: session.companyUser.companyId,
            isActive: true,
          },
          include: { employee: { select: { id: true } } },
        });
        employeeId = companyUser?.employee?.id ?? null;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create response
    let response = await prisma.surveyResponse.findFirst({
      where: { distributionId, employeeId },
    });

    if (!response) {
      response = await prisma.surveyResponse.create({
        data: { distributionId, employeeId },
      });
    }

    if (response.isComplete) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }

    // Upsert answers
    await Promise.all(
      answers.map((a) =>
        prisma.surveyAnswer.upsert({
          where: {
            responseId_questionId: {
              responseId: response!.id,
              questionId: a.questionId,
            },
          },
          create: {
            responseId: response!.id,
            questionId: a.questionId,
            ratingValue: a.ratingValue ?? null,
            textValue: a.textValue ?? null,
          },
          update: {
            ratingValue: a.ratingValue ?? null,
            textValue: a.textValue ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/climate-survey/save-draft] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
