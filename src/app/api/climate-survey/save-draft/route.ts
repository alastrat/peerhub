import { NextResponse } from "next/server";
import { saveSurveyDraft } from "@/lib/actions/climate-responses";

/**
 * Beacon-friendly endpoint for saving survey draft answers.
 * Called by navigator.sendBeacon on page unload as a last-resort save,
 * and can also be called by regular fetch. It saves exactly like the form's
 * own draft save: the respondent's company, the survey's questions and
 * scales, and its start and end are all checked there.
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

    const result = await saveSurveyDraft({ distributionId, answers });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/climate-survey/save-draft] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
