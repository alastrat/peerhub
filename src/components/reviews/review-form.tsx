"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Save, Send, Star, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { saveReviewProgress, submitReview } from "@/lib/actions/reviews";
import type { ReviewerType, QuestionType } from "@prisma/client";

interface Question {
  id: string;
  text: string;
  description: string | null;
  type: QuestionType;
  isRequired: boolean;
  order: number;
  config: Record<string, unknown> | null;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  reviewerTypes: ReviewerType[];
  questions: Question[];
}

interface ReviewFormProps {
  assignmentId: string;
  revieweeName: string;
  reviewerType: ReviewerType;
  sections: Section[];
  draftResponses?: Record<string, { ratingValue?: number; textValue?: string }>;
}

interface FormValues {
  responses: Record<string, { ratingValue?: number; textValue?: string }>;
}

export function ReviewForm({
  assignmentId,
  revieweeName,
  reviewerType,
  sections,
  draftResponses,
}: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Filter sections for this reviewer type
  const visibleSections = sections.filter((s) =>
    s.reviewerTypes.includes(reviewerType)
  );

  // Get all questions across visible sections
  const allQuestions = visibleSections.flatMap((s) => s.questions);
  const requiredQuestions = allQuestions.filter((q) => q.isRequired);

  const form = useForm<FormValues>({
    defaultValues: {
      responses: draftResponses || {},
    },
  });

  const watchedResponses = useWatch({ control: form.control, name: "responses" });

  // Calculate progress
  const answeredCount = Object.keys(watchedResponses || {}).filter((key) => {
    const response = watchedResponses[key];
    return response?.ratingValue !== undefined || response?.textValue;
  }).length;

  const progress =
    allQuestions.length > 0 ? (answeredCount / allQuestions.length) * 100 : 0;

  // Check if all required questions are answered
  const requiredAnswered = requiredQuestions.every((q) => {
    const response = watchedResponses?.[q.id];
    if (q.type === "RATING" || q.type === "COMPETENCY_RATING") {
      return response?.ratingValue !== undefined;
    }
    return !!response?.textValue;
  });

  // Autosave function
  const autoSave = useCallback(async () => {
    const responses = form.getValues("responses");
    const responseArray = Object.entries(responses)
      .filter(([, value]) => value.ratingValue !== undefined || value.textValue)
      .map(([questionId, value]) => ({
        questionId,
        ratingValue: value.ratingValue,
        textValue: value.textValue,
      }));

    if (responseArray.length === 0) return;

    setIsSaving(true);
    const result = await saveReviewProgress(assignmentId, responseArray);
    setIsSaving(false);

    if (result.success) {
      setLastSaved(new Date());
    }
  }, [assignmentId, form]);

  // Autosave every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoSave]);

  // Save on unload
  useEffect(() => {
    const handleUnload = () => {
      autoSave();
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [autoSave]);

  function handleSubmit() {
    const responses = form.getValues("responses");
    const responseArray = Object.entries(responses)
      .filter(([, value]) => value.ratingValue !== undefined || value.textValue)
      .map(([questionId, value]) => ({
        questionId,
        ratingValue: value.ratingValue,
        textValue: value.textValue,
      }));

    startTransition(async () => {
      const result = await submitReview(assignmentId, responseArray);

      if (result.success) {
        toast.success("Review submitted successfully!");
        router.push("/my-reviews");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit review");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-lg font-medium">
                {answeredCount} of {allQuestions.length} questions answered
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isSaving && (
                <span className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </span>
              )}
              {lastSaved && !isSaving && (
                <span className="flex items-center text-sm text-muted-foreground">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" onClick={autoSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Sections */}
      {visibleSections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-8">
            {section.questions.map((question, index) => (
              <QuestionField
                key={question.id}
                question={question}
                index={index + 1}
                value={watchedResponses?.[question.id]}
                onChange={(value) => {
                  form.setValue(`responses.${question.id}`, value);
                }}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              {!requiredAnswered && (
                <p className="flex items-center text-sm text-amber-600">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Please answer all required questions before submitting
                </p>
              )}
              {requiredAnswered && (
                <p className="flex items-center text-sm text-green-600">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  All required questions answered
                </p>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!requiredAnswered || isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit Review
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Review</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit your review for {revieweeName}?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    Submit Review
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface QuestionFieldProps {
  question: Question;
  index: number;
  value?: { ratingValue?: number; textValue?: string };
  onChange: (value: { ratingValue?: number; textValue?: string }) => void;
}

function QuestionField({ question, index, value, onChange }: QuestionFieldProps) {
  if (question.type === "RATING" || question.type === "COMPETENCY_RATING") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-muted-foreground w-6">
            {index}.
          </span>
          <div className="flex-1">
            <p className="font-medium">
              {question.text}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </p>
            {question.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {question.description}
              </p>
            )}
          </div>
        </div>
        <div className="ml-9">
          <RatingInput
            value={value?.ratingValue}
            onChange={(rating) => onChange({ ...value, ratingValue: rating })}
          />
        </div>
      </div>
    );
  }

  if (question.type === "TEXT") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-muted-foreground w-6">
            {index}.
          </span>
          <div className="flex-1">
            <p className="font-medium">
              {question.text}
              {question.isRequired && <span className="text-destructive ml-1">*</span>}
            </p>
            {question.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {question.description}
              </p>
            )}
          </div>
        </div>
        <div className="ml-9">
          <Textarea
            placeholder="Type your response here..."
            value={value?.textValue || ""}
            onChange={(e) => onChange({ ...value, textValue: e.target.value })}
            className="min-h-32"
          />
        </div>
      </div>
    );
  }

  return null;
}

interface RatingInputProps {
  value?: number;
  onChange: (value: number) => void;
}

function RatingInput({ value, onChange }: RatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const labels = ["Poor", "Below Average", "Average", "Good", "Excellent"];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isFilled = (hovered !== null ? hovered : value || 0) >= rating;
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              onMouseEnter={() => setHovered(rating)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "p-1 rounded transition-all",
                isFilled ? "text-amber-400" : "text-muted-foreground/30",
                "hover:scale-110"
              )}
            >
              <Star
                className={cn("h-8 w-8", isFilled && "fill-amber-400")}
              />
            </button>
          );
        })}
        {value && (
          <Badge variant="secondary" className="ml-4">
            {labels[value - 1]}
          </Badge>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );
}
