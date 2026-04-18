"use client";

import { useState, useMemo } from "react";
import { Search, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RespondentDetailSheet,
  type RespondentData,
} from "@/components/climate/respondent-detail-sheet";
import type { SurveyQuestionType } from "@prisma/client";

interface AnswerData {
  questionId: string;
  ratingValue: number | null;
  textValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ResponseRow {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle?: string | null;
  departmentName?: string | null;
  hubName?: string | null;
  isComplete: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  answeredCount: number;
  totalQuestions: number;
  answers?: AnswerData[];
  distributionSentAt?: Date | null;
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

type Filter = "all" | "pending" | "completed";

interface SurveyAnswersTabProps {
  responses: ResponseRow[];
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  surveyId: string;
  isDraft: boolean;
  questions?: QuestionData[];
  questionAverages?: Record<string, number>;
  isAnonymous?: boolean;
}

function formatTimeDiff(start: Date, end: Date): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

function formatActivityDate(date: Date): string {
  const d = new Date(date);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

export function SurveyAnswersTab({
  responses,
  totalCount,
  completedCount,
  pendingCount,
  isDraft,
  questions = [],
  questionAverages = {},
  isAnonymous = false,
}: SurveyAnswersTabProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = responses;
    if (filter === "completed") list = list.filter((r) => r.isComplete);
    if (filter === "pending") list = list.filter((r) => !r.isComplete);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeEmail.toLowerCase().includes(q)
      );
    }
    return list;
  }, [responses, filter, search]);

  const selectedRespondent: RespondentData | null = useMemo(() => {
    if (!selectedId) return null;
    const r = responses.find((r) => r.id === selectedId);
    if (!r) return null;
    return {
      id: r.id,
      employeeName: r.employeeName,
      employeeEmail: r.employeeEmail,
      employeeTitle: r.employeeTitle ?? null,
      departmentName: r.departmentName ?? null,
      hubName: r.hubName ?? null,
      isComplete: r.isComplete,
      submittedAt: r.submittedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      answeredCount: r.answeredCount,
      totalQuestions: r.totalQuestions,
      answers: r.answers ?? [],
      distributionSentAt: r.distributionSentAt ?? null,
    };
  }, [selectedId, responses]);

  if (isDraft) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Send className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 font-semibold">No responses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Send the survey to start collecting responses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({totalCount})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Completed ({completedCount})
          </Button>
        </div>
      </div>

      {/* Search (hidden for anonymous surveys) */}
      {!isAnonymous && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Respondent</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {search
                      ? "No respondents match your search."
                      : "No respondents found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const progress =
                    r.totalQuestions > 0
                      ? Math.round(
                          (r.answeredCount / r.totalQuestions) * 100
                        )
                      : 0;
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedId(r.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {isAnonymous
                              ? `Respondent ${filtered.indexOf(r) + 1}`
                              : r.employeeName}
                          </p>
                          {!isAnonymous && (
                            <p className="text-xs text-muted-foreground">
                              {r.employeeEmail}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatActivityDate(r.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress
                            value={r.isComplete ? 100 : progress}
                            className="h-2 w-24"
                          />
                          {r.isComplete ? (
                            <Badge
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700"
                            >
                              Completed
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {progress}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {r.submittedAt
                          ? formatTimeDiff(r.createdAt, r.submittedAt)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <RespondentDetailSheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        respondent={selectedRespondent}
        questions={questions}
        questionAverages={questionAverages}
        isAnonymous={isAnonymous}
      />
    </div>
  );
}
