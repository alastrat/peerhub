"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { submitTokenReview } from "@/lib/actions/reviews";
import type { QuestionType, ReviewerType } from "@prisma/client";

interface Question {
  id: string;
  text: string;
  description: string | null;
  type: QuestionType;
  isRequired: boolean;
  config: {
    scale?: { min: number; max: number; labels?: Record<string, string> };
    maxLength?: number;
    placeholder?: string;
  } | null;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  reviewerTypes: ReviewerType[];
  questions: Question[];
}

interface ExternalReviewFormProps {
  token: string;
  revieweeName: string;
  companyName: string;
  cycleName: string;
  sections: Section[];
}

interface Response {
  questionId: string;
  ratingValue?: number | null;
  textValue?: string | null;
}

export function ExternalReviewForm({
  token,
  revieweeName,
  companyName,
  cycleName,
  sections,
}: ExternalReviewFormProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  // Filter sections for EXTERNAL reviewer type
  const filteredSections = sections.filter((s) =>
    s.reviewerTypes.includes("EXTERNAL")
  );

  if (filteredSections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No questions available for external reviewers.
        </CardContent>
      </Card>
    );
  }

  const activeSection = filteredSections[currentSection];
  const isLastSection = currentSection === filteredSections.length - 1;
  const isFirstSection = currentSection === 0;

  const updateResponse = (
    questionId: string,
    value: { ratingValue?: number | null; textValue?: string | null }
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...value,
        questionId,
      },
    }));
  };

  const validateSection = (section: Section): boolean => {
    const requiredQuestions = section.questions.filter((q) => q.isRequired);

    for (const question of requiredQuestions) {
      const response = responses[question.id];
      if (!response) return false;

      if (question.type === "RATING" || question.type === "COMPETENCY_RATING") {
        if (response.ratingValue === null || response.ratingValue === undefined) {
          return false;
        }
      } else if (question.type === "TEXT") {
        if (!response.textValue?.trim()) {
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateSection(activeSection)) {
      toast.error("Please answer all required questions");
      return;
    }
    setCurrentSection((prev) => Math.min(prev + 1, filteredSections.length - 1));
  };

  const handlePrevious = () => {
    setCurrentSection((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateSection(activeSection)) {
      toast.error("Please answer all required questions");
      return;
    }

    setSubmitting(true);
    try {
      const responseArray = Object.values(responses);
      const result = await submitTokenReview(token, responseArray);

      if (result.success) {
        router.push(`/review/${token}/success`);
      } else {
        toast.error(result.error || "Failed to submit feedback");
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback for {revieweeName}</CardTitle>
          <CardDescription>
            {companyName} has requested your feedback as part of their "{cycleName}" review cycle.
            Your responses are confidential and will be aggregated with other feedback.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Section {currentSection + 1} of {filteredSections.length}
        </span>
        <div className="flex gap-1">
          {filteredSections.map((_, i) => (
            <div
              key={i}
              className={`w-8 h-1 rounded ${i <= currentSection ? "bg-primary" : "bg-muted"
                }`}
            />
          ))}
        </div>
      </div>

      {/* Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{activeSection.title}</CardTitle>
          {activeSection.description && (
            <CardDescription>{activeSection.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          {activeSection.questions.map((question) => (
            <div key={question.id} className="space-y-3">
              <Label className="text-base">
                {question.text}
                {question.isRequired && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
              {question.description && (
                <p className="text-sm text-muted-foreground">
                  {question.description}
                </p>
              )}

              {(question.type === "RATING" || question.type === "COMPETENCY_RATING") && (
                <RatingInput
                  value={responses[question.id]?.ratingValue ?? null}
                  onChange={(value) =>
                    updateResponse(question.id, { ratingValue: value })
                  }
                  config={question.config}
                />
              )}

              {question.type === "TEXT" && (
                <Textarea
                  placeholder={question.config?.placeholder || "Enter your response..."}
                  value={responses[question.id]?.textValue || ""}
                  onChange={(e) =>
                    updateResponse(question.id, { textValue: e.target.value })
                  }
                  maxLength={question.config?.maxLength || 2000}
                  rows={4}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstSection}
        >
          Previous
        </Button>

        {isLastSection ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>Next</Button>
        )}
      </div>
    </div>
  );
}

function RatingInput({
  value,
  onChange,
  config,
}: {
  value: number | null;
  onChange: (value: number) => void;
  config: Question["config"];
}) {
  const min = config?.scale?.min ?? 1;
  const max = config?.scale?.max ?? 5;
  const labels = config?.scale?.labels ?? {};

  return (
    <div className="space-y-4">
      <Slider
        min={min}
        max={max}
        step={1}
        value={value !== null ? [value] : [Math.floor((min + max) / 2)]}
        onValueChange={([v]) => onChange(v)}
        className="py-4"
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{labels[min.toString()] || min}</span>
        {value !== null && (
          <span className="font-medium text-foreground">
            Selected: {value} {labels[value.toString()] && `- ${labels[value.toString()]}`}
          </span>
        )}
        <span>{labels[max.toString()] || max}</span>
      </div>
    </div>
  );
}
