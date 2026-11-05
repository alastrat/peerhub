import { NextResponse } from "next/server";
import { sendPlanDeadlineReminders, sendTaskReminders } from "@/lib/queries/action-plan-reminders";
import { finishSurveysPastEndDate } from "@/lib/climate/survey-finish";

// Same contract as /api/cron/send-reminders: Bearer CRON_SECRET, open in dev.
function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Surveys past their end date close first: that sends their results emails
    const closed = await finishSurveysPastEndDate();
    const [tasks, deadlines] = await Promise.all([sendTaskReminders(), sendPlanDeadlineReminders()]);
    return NextResponse.json({ success: true, closed, tasks, deadlines });
  } catch (error) {
    console.error("climate-plans cron failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
