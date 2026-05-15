"use client";

import { useEffect, useState, useTransition } from "react";
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
import { DimensionCombobox } from "@/components/climate/dimension-combobox";
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
  dimensions: initialDimensions,
}: SurveyQuestionsTabProps) {
  const t = useTranslations("dashboard.climate.detail");
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  // Local copy so newly-created dimensions from the inline combobox survive
  // until the next router refresh — otherwise the option list would silently
  // miss what the user just created.
  const [dimensions, setDimensions] =
    useState<DimensionOption[]>(initialDimensions);
  const handleDimensionCreated = (dim: DimensionOption) => {
    setDimensions((prev) =>
      prev.some((d) => d.id === dim.id) ? prev : [...prev, dim],
    );
  };
  // Drive pencil visibility from React state — CSS group-hover wasn't
  // reliably surfacing it earlier. Combined with focus tracking + a touch
  // detector, this keeps the affordance accessible for pointer / keyboard /
  // touch users (CodeRabbit flagged the original hover-only version).
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: none)");
    setIsTouch(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
          <DimensionGroups
            questions={questions}
            canEditAtAll={canEditAtAll}
            hoveredId={hoveredId}
            focusedId={focusedId}
            isTouch={isTouch}
            onHover={setHoveredId}
            onFocus={setFocusedId}
            onEdit={setEditing}
            t={t}
          />
        </CardContent>
      </Card>

      <EditQuestionDialog
        surveyId={surveyId}
        dimensions={dimensions}
        onDimensionCreated={handleDimensionCreated}
        textOnly={isTextOnly}
        question={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Grouped renderer

const NO_DIM_KEY = "__none__";

type T = ReturnType<typeof useTranslations>;

interface DimensionGroupsProps {
  questions: QuestionRow[];
  canEditAtAll: boolean;
  hoveredId: string | null;
  focusedId: string | null;
  isTouch: boolean;
  onHover: (id: string | null) => void;
  onFocus: (id: string | null) => void;
  onEdit: (q: QuestionRow) => void;
  t: T;
}

function DimensionGroups({
  questions,
  canEditAtAll,
  hoveredId,
  focusedId,
  isTouch,
  onHover,
  onFocus,
  onEdit,
  t,
}: DimensionGroupsProps) {
  // Global 1-based index per question id — kept stable when grouping so the
  // badge identifies the same question whether the view is flat or grouped.
  const globalIndex = new Map(questions.map((q, i) => [q.id, i + 1]));

  // Build groups in order of first appearance, then move the "no dimension"
  // bucket to the end if it exists alongside real dimensions.
  const groups: { key: string; name: string | null; items: QuestionRow[] }[] = [];
  for (const q of questions) {
    const key = q.dimension?.id ?? NO_DIM_KEY;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, name: q.dimension?.name ?? null, items: [] };
      groups.push(group);
    }
    group.items.push(q);
  }
  const noneIdx = groups.findIndex((g) => g.key === NO_DIM_KEY);
  if (noneIdx !== -1 && groups.length > 1) {
    const [none] = groups.splice(noneIdx, 1);
    groups.push(none);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <header className="flex items-baseline gap-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.name ?? t("questions_tab.no_dimension_group")}
            </h3>
            <span className="text-xs text-muted-foreground">
              {t(
                group.items.length === 1
                  ? "questions_count_one"
                  : "questions_count_other",
                { count: group.items.length },
              )}
            </span>
          </header>
          <div className="space-y-3">
            {group.items.map((q) => {
              const n = globalIndex.get(q.id) ?? 0;
              const showPencil =
                canEditAtAll &&
                (isTouch || hoveredId === q.id || focusedId === q.id);
              return (
                <div
                  key={q.id}
                  onMouseEnter={() => onHover(q.id)}
                  onMouseLeave={() =>
                    onHover(hoveredId === q.id ? null : hoveredId)
                  }
                  onFocus={() => onFocus(q.id)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      onFocus(focusedId === q.id ? null : focusedId);
                    }
                  }}
                  className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {n}.
                  </span>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="font-medium">{q.text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {SURVEY_QUESTION_TYPE_LABELS[q.type]}
                      </Badge>
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
                        n,
                      })}
                      className={`h-8 w-8 shrink-0 border-foreground/30 bg-background text-foreground hover:bg-foreground hover:text-background focus-visible:opacity-100 focus-visible:pointer-events-auto transition-opacity ${
                        showPencil
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 pointer-events-none"
                      }`}
                      onClick={() => onEdit(q)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

interface EditQuestionDialogProps {
  surveyId: string;
  dimensions: DimensionOption[];
  onDimensionCreated: (d: DimensionOption) => void;
  textOnly: boolean;
  question: QuestionRow | null;
  onClose: () => void;
}

function EditQuestionDialog({
  surveyId,
  dimensions,
  onDimensionCreated,
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
            <DimensionCombobox
              dimensions={dimensions}
              // DimensionCombobox treats "" as "no dimension"; we keep
              // "__none__" internally to match the submit code below.
              value={dimensionId === "__none__" ? "" : dimensionId}
              onChange={(id) => setDimensionId(id || "__none__")}
              onCreated={onDimensionCreated}
              disabled={textOnly}
            />
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
