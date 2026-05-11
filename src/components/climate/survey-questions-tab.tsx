"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SURVEY_QUESTION_TYPE_LABELS } from "@/lib/constants/climate-survey";
import { updateClimateSurveyQuestion } from "@/lib/actions/climate-surveys";
import type { SurveyQuestionType } from "@prisma/client";

interface QuestionRow {
  id: string;
  text: string;
  type: SurveyQuestionType;
  isRequired: boolean;
  dimensionId: string | null;
  dimension: { id: string; name: string } | null;
}

interface DimensionOption {
  id: string;
  name: string;
}

interface SurveyQuestionsTabProps {
  surveyId: string;
  isAnonymous: boolean;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  questions: QuestionRow[];
  dimensions: DimensionOption[];
}

const QUESTION_TYPES: SurveyQuestionType[] = ["LIKERT", "TEXT", "NPS", "RATING"];

export function SurveyQuestionsTab({
  surveyId,
  isAnonymous,
  status,
  questions,
  dimensions,
}: SurveyQuestionsTabProps) {
  const t = useTranslations("dashboard.climate.detail");
  const [editing, setEditing] = useState<QuestionRow | null>(null);

  const canEditAtAll = status !== "ARCHIVED";
  const canEditStructure = status === "DRAFT";
  const isTextOnly = canEditAtAll && !canEditStructure;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("questions_tab.title")}</CardTitle>
          <CardDescription>
            {isAnonymous
              ? t("questions_tab.anonymous_survey")
              : t("questions_tab.non_anonymous_survey")}{" "}
            ·{" "}
            {t(
              questions.length === 1
                ? "questions_count_one"
                : "questions_count_other",
              { count: questions.length },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="group flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="font-medium">{q.text}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {SURVEY_QUESTION_TYPE_LABELS[q.type]}
                    </Badge>
                    {q.dimension && (
                      <Badge variant="secondary" className="text-xs">
                        {q.dimension.name}
                      </Badge>
                    )}
                    {q.isRequired && (
                      <Badge variant="secondary" className="text-xs">
                        {t("questions_tab.required_badge")}
                      </Badge>
                    )}
                  </div>
                </div>
                {canEditAtAll && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("questions_tab.edit_dialog.edit_aria", {
                      n: i + 1,
                    })}
                    className="h-8 w-8 shrink-0 border-foreground/20 bg-background text-foreground hover:bg-foreground hover:text-background opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditing(q)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EditQuestionDialog
        surveyId={surveyId}
        dimensions={dimensions}
        textOnly={isTextOnly}
        question={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

interface EditQuestionDialogProps {
  surveyId: string;
  dimensions: DimensionOption[];
  textOnly: boolean;
  question: QuestionRow | null;
  onClose: () => void;
}

function EditQuestionDialog({
  surveyId,
  dimensions,
  textOnly,
  question,
  onClose,
}: EditQuestionDialogProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.climate.detail.questions_tab.edit_dialog");
  const [isPending, startTransition] = useTransition();

  const open = question !== null;

  // The dialog is uncontrolled-ish: state lives here, seeded from `question`
  // each time it opens. Avoids stale-state bugs when the parent changes which
  // row is being edited.
  const [text, setText] = useState("");
  const [type, setType] = useState<SurveyQuestionType>("LIKERT");
  const [dimensionId, setDimensionId] = useState<string>("__none__");
  const [isRequired, setIsRequired] = useState(true);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  if (question && hydratedFor !== question.id) {
    setText(question.text);
    setType(question.type);
    setDimensionId(question.dimensionId ?? "__none__");
    setIsRequired(question.isRequired);
    setHydratedFor(question.id);
  }
  if (!question && hydratedFor !== null) {
    setHydratedFor(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error(t("text_required"));
      return;
    }

    startTransition(async () => {
      const result = await updateClimateSurveyQuestion(surveyId, question.id, {
        text: trimmed,
        type,
        dimensionId: dimensionId === "__none__" ? null : dimensionId,
        isRequired,
      });
      if (!result.success) {
        toast.error(result.error || t("error"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {textOnly ? t("description_text_only") : t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="eq-text">{t("text_label")}</Label>
            <Textarea
              id="eq-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              {t("type_label")}
              {textOnly && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({t("structural_locked")})
                </span>
              )}
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as SurveyQuestionType)}
              disabled={textOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((qt) => (
                  <SelectItem key={qt} value={qt}>
                    {SURVEY_QUESTION_TYPE_LABELS[qt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("dimension_label")}</Label>
            <Select
              value={dimensionId}
              onValueChange={setDimensionId}
              disabled={textOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("dimension_none")}</SelectItem>
                {dimensions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <Label htmlFor="eq-required" className="cursor-pointer">
              {t("required_label")}
            </Label>
            <Switch
              id="eq-required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
              disabled={textOnly}
            />
          </div>

          {textOnly && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("text_only_hint")}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
