"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Lock } from "lucide-react";
import type { QuestionReport } from "@/types";
import type { ReviewerType } from "@prisma/client";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants/roles";
import { useState } from "react";

interface SectionResultsProps {
  sectionTitle: string;
  questions: QuestionReport[];
  maxRating?: number;
}

export function SectionResults({
  sectionTitle,
  questions,
  maxRating = 5,
}: SectionResultsProps) {
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = (questionId: string) => {
    const newOpen = new Set(openQuestions);
    if (newOpen.has(questionId)) {
      newOpen.delete(questionId);
    } else {
      newOpen.add(questionId);
    }
    setOpenQuestions(newOpen);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sectionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question) => {
          const isRating =
            question.questionType === "RATING" ||
            question.questionType === "COMPETENCY_RATING";
          const isOpen = openQuestions.has(question.questionId);

          return (
            <Collapsible
              key={question.questionId}
              open={isOpen}
              onOpenChange={() => toggleQuestion(question.questionId)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex-1 text-left">
                    <p className="font-medium">{question.questionText}</p>
                    {isRating && question.overall && (
                      <div className="flex items-center gap-2 mt-2">
                        <Progress
                          value={(question.overall.average / maxRating) * 100}
                          className="h-2 w-32"
                        />
                        <span className="text-sm text-muted-foreground">
                          {question.overall.average.toFixed(2)} avg ({question.overall.count} responses)
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4 space-y-4 bg-muted/30 rounded-b-lg border-x border-b">
                  {isRating ? (
                    <RatingBreakdown
                      byReviewerType={question.byReviewerType}
                      maxRating={maxRating}
                    />
                  ) : (
                    <TextBreakdown byReviewerType={question.byReviewerType} />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RatingBreakdown({
  byReviewerType,
  maxRating,
}: {
  byReviewerType: QuestionReport["byReviewerType"];
  maxRating: number;
}) {
  const types: ReviewerType[] = ["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "EXTERNAL"];

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {types.map((type) => {
        const result = byReviewerType[type];
        if (!result) return null;

        return (
          <div key={type} className="p-3 bg-background rounded-lg border">
            <p className="text-sm font-medium mb-2">{REVIEWER_TYPE_LABELS[type]}</p>
            {result.isVisible && result.rating ? (
              <>
                <div className="flex items-center gap-2">
                  <Progress
                    value={(result.rating.average / maxRating) * 100}
                    className="h-2 flex-1"
                  />
                  <span className="text-sm font-medium">
                    {result.rating.average.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.rating.count} response{result.rating.count !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-xs">{result.message || "No responses"}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TextBreakdown({
  byReviewerType,
}: {
  byReviewerType: QuestionReport["byReviewerType"];
}) {
  const allResponses: string[] = [];
  const types: ReviewerType[] = ["SELF", "MANAGER", "PEER", "DIRECT_REPORT", "EXTERNAL"];

  types.forEach((type) => {
    const result = byReviewerType[type];
    if (result?.isVisible && result.textResponses) {
      allResponses.push(...result.textResponses);
    }
  });

  if (allResponses.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
        <Lock className="h-4 w-4" />
        <span className="text-sm">
          Not enough responses to display (anonymity protection)
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allResponses.map((response, index) => (
        <div key={index} className="p-3 bg-background rounded-lg border">
          <p className="text-sm">{response}</p>
        </div>
      ))}
    </div>
  );
}
