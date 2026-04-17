"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Play,
  Send,
  ClipboardCheck,
  UserCircle2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SurveyQuestionType } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AnswerData {
  questionId: string;
  ratingValue: number | null;
  textValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionData {
  id: string;
  text: string;
  type: SurveyQuestionType;
  order: number;
  isRequired: boolean;
  dimensionId: string | null;
  dimensionName: string | null;
}

export interface RespondentData {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle: string | null;
  departmentName: string | null;
  hubName: string | null;
  isComplete: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  answeredCount: number;
  totalQuestions: number;
  answers: AnswerData[];
  distributionSentAt: Date | null;
}

interface RespondentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  respondent: RespondentData | null;
  questions: QuestionData[];
  questionAverages: Record<string, number>;
  isAnonymous: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const LIKERT_LABELS: Record<number, string> = {
  1: "Nunca",
  2: "Casi nunca",
  3: "Casi siempre",
  4: "Siempre",
};

function formatTimeDiff(start: Date, end: Date): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function ratingColor(value: number, max: number) {
  const pct = (value / max) * 100;
  if (pct >= 75) return { pill: "bg-green-50 text-green-700 border-green-200", bar: "#22c55e" };
  if (pct >= 50) return { pill: "bg-yellow-50 text-yellow-700 border-yellow-200", bar: "#eab308" };
  return { pill: "bg-red-50 text-red-700 border-red-200", bar: "#ef4444" };
}

function maxForType(type: SurveyQuestionType): number {
  if (type === "NPS") return 10;
  if (type === "RATING") return 5;
  return 4; // LIKERT 4-point
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RespondentDetailSheet({
  open,
  onOpenChange,
  respondent,
  questions,
  questionAverages,
  isAnonymous,
}: RespondentDetailSheetProps) {
  // Compute per-respondent stats
  const stats = useMemo(() => {
    if (!respondent) return null;

    const ratingAnswers = respondent.answers.filter(
      (a) => a.ratingValue != null
    );
    const ratingQuestions = questions.filter((q) => q.type !== "TEXT");
    const avgScore =
      ratingAnswers.length > 0
        ? ratingAnswers.reduce((s, a) => s + a.ratingValue!, 0) /
          ratingAnswers.length
        : null;

    // Survey-wide overall average for comparison
    const surveyAvgValues = Object.values(questionAverages);
    const surveyOverallAvg =
      surveyAvgValues.length > 0
        ? surveyAvgValues.reduce((s, v) => s + v, 0) / surveyAvgValues.length
        : null;

    const diff =
      avgScore != null && surveyOverallAvg != null
        ? avgScore - surveyOverallAvg
        : null;

    // Dimension scores for this respondent
    const dimMap = new Map<
      string,
      { name: string; ratings: number[]; maxScore: number }
    >();
    for (const q of questions) {
      if (!q.dimensionId || !q.dimensionName || q.type === "TEXT") continue;
      const ans = respondent.answers.find((a) => a.questionId === q.id);
      if (!ans?.ratingValue) continue;
      if (!dimMap.has(q.dimensionId)) {
        dimMap.set(q.dimensionId, {
          name: q.dimensionName,
          ratings: [],
          maxScore: maxForType(q.type),
        });
      }
      dimMap.get(q.dimensionId)!.ratings.push(ans.ratingValue);
    }
    const dimensionScores = Array.from(dimMap.entries()).map(
      ([id, { name, ratings, maxScore }]) => ({
        id,
        name,
        average:
          ratings.reduce((s, v) => s + v, 0) / ratings.length,
        maxScore,
        count: ratings.length,
      })
    );

    // Compute survey-wide average time for comparison
    // (not available here, skip)

    return {
      avgScore,
      surveyOverallAvg,
      diff,
      ratingQuestionCount: ratingQuestions.length,
      dimensionScores,
    };
  }, [respondent, questions, questionAverages]);

  if (!respondent) return null;

  const answerMap = new Map(
    respondent.answers.map((a) => [a.questionId, a])
  );

  // Timeline events
  const timeline: {
    icon: React.ReactNode;
    label: string;
    date: string;
    detail?: string;
  }[] = [];

  if (respondent.isComplete && respondent.submittedAt) {
    timeline.push({
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Survey submitted",
      date: formatDateTime(respondent.submittedAt),
      detail: `All ${respondent.totalQuestions} questions answered`,
    });
  }

  // Last draft / activity
  if (respondent.updatedAt) {
    const label =
      respondent.isComplete && respondent.submittedAt
        ? respondent.updatedAt.getTime() !== respondent.submittedAt.getTime()
          ? "Last draft saved"
          : null
        : "Last activity";
    if (label) {
      timeline.push({
        icon: <ClipboardCheck className="h-4 w-4" />,
        label,
        date: formatDateTime(respondent.updatedAt),
        detail: `${respondent.answeredCount} of ${respondent.totalQuestions} questions answered`,
      });
    }
  }

  // Earliest answer = "Started survey"
  const answerDates = respondent.answers
    .map((a) => new Date(a.createdAt).getTime())
    .filter((t) => !isNaN(t));
  if (answerDates.length > 0) {
    timeline.push({
      icon: <Play className="h-4 w-4" />,
      label: "Survey started",
      date: formatDateTime(new Date(Math.min(...answerDates))),
    });
  }

  if (respondent.distributionSentAt) {
    timeline.push({
      icon: <Send className="h-4 w-4" />,
      label: "Invitation sent",
      date: formatDateTime(respondent.distributionSentAt),
      detail: "Via email notification",
    });
  }

  // Determine the max score for the dominant question type
  const dominantMax =
    questions.filter((q) => q.type !== "TEXT").length > 0
      ? maxForType(
          questions.find((q) => q.type !== "TEXT")!.type
        )
      : 4;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col overflow-hidden gap-0 p-0 sm:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center border-b px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#613171]/10 text-[#613171]">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <SheetHeader className="flex-col items-start mx-4 space-y-0">
            <SheetTitle className="text-base leading-snug">
              {isAnonymous ? "Anonymous Respondent" : respondent.employeeName}
            </SheetTitle>
            <SheetDescription className="text-xs leading-tight">
              {isAnonymous ? (
                "Identity hidden — anonymous survey"
              ) : (
                <>
                  {respondent.employeeEmail}
                  {respondent.employeeTitle && (
                    <> · {respondent.employeeTitle}</>
                  )}
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          <Badge
            variant="outline"
            className={
              respondent.isComplete
                ? "shrink-0 border-green-200 bg-green-50 text-green-700"
                : "shrink-0 border-yellow-200 bg-yellow-50 text-yellow-700"
            }
          >
            {respondent.isComplete ? "Completed" : "In Progress"}
          </Badge>
        </div>

        {/* Inner tabs: Report | Answers — sticky tab bar */}
        <Tabs defaultValue="report" className="flex min-h-0 flex-1 flex-col">
          <div className="sticky top-0 z-10 border-b bg-background px-6 py-2">
            <TabsList className="h-auto gap-1 rounded-lg bg-muted p-1">
              <TabsTrigger
                value="report"
                className="gap-1.5 rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Report
              </TabsTrigger>
              <TabsTrigger
                value="answers"
                className="gap-1.5 rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Answers
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ---- REPORT TAB ---- */}
          <TabsContent value="report" className="mt-0 flex-1 overflow-y-auto">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 border-b px-6 py-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <div className="text-xl font-bold">
                  {stats?.avgScore != null
                    ? stats.avgScore.toFixed(1)
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Avg. Score</div>
                {stats?.diff != null && (
                  <div
                    className={`mt-0.5 text-xs font-medium ${
                      stats.diff >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stats.diff >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(stats.diff).toFixed(1)} vs avg
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <div className="text-xl font-bold">
                  {respondent.answeredCount}/{respondent.totalQuestions}
                </div>
                <div className="text-xs text-muted-foreground">Answered</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {respondent.totalQuestions > 0
                    ? Math.round(
                        (respondent.answeredCount /
                          respondent.totalQuestions) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <div className="text-xl font-bold">
                  {respondent.submittedAt
                    ? formatTimeDiff(
                        respondent.createdAt,
                        respondent.submittedAt
                      )
                    : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
            </div>

            {/* Dimension scores */}
            {stats && stats.dimensionScores.length > 0 && (
              <div className="border-b px-6 py-2">
                <h4 className="mb-3 text-sm font-semibold">
                  Scores by Dimension
                </h4>
                <div className="space-y-3">
                  {stats.dimensionScores
                    .sort((a, b) => b.average - a.average)
                    .map((dim) => {
                      const pct = (dim.average / dim.maxScore) * 100;
                      const barColor =
                        pct >= 75
                          ? "#22c55e"
                          : pct >= 50
                            ? "#eab308"
                            : "#ef4444";
                      return (
                        <div key={dim.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{dim.name}</span>
                            <span className="text-muted-foreground">
                              {dim.average.toFixed(1)} / {dim.maxScore}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="px-6 py-2">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                History
              </h4>
              <div className="relative ml-4">
                {/* Vertical line spanning all items */}
                <div className="absolute left-[15px] top-[32px] bottom-[8px] w-0.5 bg-border" />
                {timeline.map((event, i) => (
                  <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background ${
                        i === 0
                          ? "border-[#613171] text-[#613171]"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {event.icon}
                    </div>
                    {/* Content */}
                    <div className="pt-1">
                      <span className="text-sm font-medium">
                        {event.label}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {event.date}
                      </span>
                      {event.detail && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {event.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ---- ANSWERS TAB ---- */}
          <TabsContent value="answers" className="mt-0 flex-1 overflow-y-auto">
            <div className="divide-y">
              {questions.map((q, i) => {
                const ans = answerMap.get(q.id);
                const hasRating = ans?.ratingValue != null;
                const hasText =
                  ans?.textValue != null && ans.textValue.trim().length > 0;
                const max = maxForType(q.type);
                const surveyAvg = questionAverages[q.id];

                return (
                  <div key={q.id} className="px-6 py-4">
                    {/* Question header */}
                    <div className="mb-2 flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-medium text-muted-foreground">
                        {i + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="text-sm leading-snug">{q.text}</p>
                        {q.dimensionName && (
                          <Badge
                            variant="outline"
                            className="mt-1 border-[#613171]/20 bg-[#613171]/5 text-[#613171] text-[10px] px-1.5 py-0"
                          >
                            {q.dimensionName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Answer */}
                    {hasRating && (
                      <div className="ml-5 flex items-center gap-2.5">
                        <span
                          className={`inline-flex min-w-[32px] items-center justify-center rounded-md border px-2 py-1 text-sm font-semibold ${ratingColor(ans!.ratingValue!, max).pill}`}
                        >
                          {ans!.ratingValue}
                        </span>
                        {q.type === "LIKERT" &&
                          LIKERT_LABELS[ans!.ratingValue!] && (
                            <span className="text-xs text-muted-foreground">
                              {LIKERT_LABELS[ans!.ratingValue!]}
                            </span>
                          )}
                        {/* Comparison bar */}
                        <div className="relative h-1.5 flex-1 max-w-[140px] rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(ans!.ratingValue! / max) * 100}%`,
                              backgroundColor: ratingColor(
                                ans!.ratingValue!,
                                max
                              ).bar,
                            }}
                          />
                          {surveyAvg != null && (
                            <div
                              className="absolute top-[-3px] h-[12px] w-[2px] rounded-sm bg-foreground/60"
                              style={{
                                left: `${(surveyAvg / max) * 100}%`,
                              }}
                              title={`Survey avg: ${surveyAvg.toFixed(1)}`}
                            />
                          )}
                        </div>
                        {surveyAvg != null && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            avg {surveyAvg.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}

                    {hasText && (
                      <div className="ml-5 mt-1.5 rounded-md border bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground">
                        {ans!.textValue}
                      </div>
                    )}

                    {!hasRating && !hasText && (
                      <p className="ml-5 text-xs italic text-muted-foreground/60">
                        No answer
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
