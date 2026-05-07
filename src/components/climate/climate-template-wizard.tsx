"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ImportQuestionsDialog } from "@/components/climate/import-questions-dialog";
import type { ParsedQuestionRow } from "@/lib/utils/climate-questions-import";
import {
  createClimateSurveyTemplate,
  updateClimateSurveyTemplate,
} from "@/lib/actions/climate-survey-templates";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  SURVEY_QUESTION_TYPE_LABELS,
} from "@/lib/constants/climate-survey";

interface DimensionOption {
  id: string;
  name: string;
}

interface QuestionRow {
  text: string;
  type: "LIKERT" | "TEXT" | "NPS" | "RATING";
  dimensionId: string;
  isRequired: boolean;
}

interface InitialData {
  id: string;
  name: string;
  description: string | null;
  type: "CLIMATE" | "PULSE" | "ENPS";
  questions: {
    text: string;
    type: "LIKERT" | "TEXT" | "NPS" | "RATING";
    dimensionId: string | null;
    isRequired: boolean;
  }[];
}

const STEP_KEYS = ["basics", "questions", "review"] as const;

const DEFAULT_ENPS_QUESTIONS: QuestionRow[] = [
  {
    text: "How likely are you to recommend this company as a place to work to a friend or colleague?",
    type: "NPS",
    dimensionId: "",
    isRequired: true,
  },
  {
    text: "What is the primary reason for your score?",
    type: "TEXT",
    dimensionId: "",
    isRequired: false,
  },
];

export function ClimateTemplateWizard({
  dimensions,
  initialData,
  mode = "create",
}: {
  dimensions: DimensionOption[];
  initialData?: InitialData;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.climate.wizard");
  const STEPS = STEP_KEYS.map((k) => t(`steps.${k}`));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [surveyType, setSurveyType] = useState<"CLIMATE" | "PULSE" | "ENPS">(
    initialData?.type || "CLIMATE"
  );

  const [questions, setQuestions] = useState<QuestionRow[]>(
    initialData?.questions.map((q) => ({
      text: q.text,
      type: q.type,
      dimensionId: q.dimensionId || "",
      isRequired: q.isRequired,
    })) || [{ text: "", type: "LIKERT", dimensionId: "", isRequired: true }]
  );

  const handleTypeChange = (type: "CLIMATE" | "PULSE" | "ENPS") => {
    setSurveyType(type);
    if (type === "ENPS") {
      setQuestions(DEFAULT_ENPS_QUESTIONS);
    } else {
      if (questions.length === 0) {
        setQuestions([{ text: "", type: "LIKERT", dimensionId: "", isRequired: true }]);
      }
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: "", type: "LIKERT", dimensionId: "", isRequired: true },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionRow, value: string | boolean) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return questions.length > 0 && questions.every((q) => q.text.trim().length > 0);
    return true;
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: surveyType,
        questions: questions.map((q, i) => ({
          text: q.text.trim(),
          type: q.type,
          dimensionId: q.dimensionId || undefined,
          order: i,
          isRequired: q.isRequired,
        })),
      };

      const result =
        mode === "edit" && initialData?.id
          ? await updateClimateSurveyTemplate(initialData.id, payload)
          : await createClimateSurveyTemplate(payload);

      if (result.success) {
        router.push("/surveys/climate/templates");
      } else {
        setError(result.error || "Failed to save template");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? "bg-[#613171] text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i <= step ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Step 1: Basics */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("basics.template_details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("basics.template_name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("placeholders.template_name")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("basics.description_optional")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("placeholders.template_description")}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("basics.survey_type")}</Label>
              <Select value={surveyType} onValueChange={(v) => handleTypeChange(v as "CLIMATE" | "PULSE" | "ENPS")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIMATE_SURVEY_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Questions */}
      {step === 1 && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-2 text-sm font-medium text-muted-foreground w-6">
                      {i + 1}.
                    </span>
                    <div className="flex-1 space-y-3">
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(i, "text", e.target.value)}
                        placeholder="Enter question text..."
                      />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={q.type}
                            onValueChange={(v) => updateQuestion(i, "type", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SURVEY_QUESTION_TYPE_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Dimension</Label>
                          <Select
                            value={q.dimensionId || "none"}
                            onValueChange={(v) => updateQuestion(i, "dimensionId", v === "none" ? "" : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No dimension" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No dimension</SelectItem>
                              {dimensions.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={q.isRequired}
                              onCheckedChange={(v) => updateQuestion(i, "isRequired", v)}
                            />
                            <Label className="text-xs">Required</Label>
                          </div>
                          {questions.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeQuestion(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
            <ImportQuestionsDialog
              dimensions={dimensions}
              onImport={(rows: ParsedQuestionRow[], mode) => {
                const next =
                  mode === "replace"
                    ? rows.map((r) => ({ ...r }))
                    : [
                        ...questions.filter((q) => q.text.trim() !== ""),
                        ...rows.map((r) => ({ ...r })),
                      ];
                setQuestions(next);
              }}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="secondary">{CLIMATE_SURVEY_TYPE_LABELS[surveyType]}</Badge>
              </div>
            </div>
            {description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Questions ({questions.length})
              </p>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {SURVEY_QUESTION_TYPE_LABELS[q.type]}
                        </Badge>
                        {q.isRequired && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push("/surveys/climate/templates") : setStep(step - 1))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 0 ? t("actions.cancel") : t("actions.previous")}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            {t("actions.next")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isPending || !canProceed()}>
            {isPending
              ? t("actions.saving")
              : mode === "edit"
                ? t("actions.save_changes")
                : t("actions.create_template")}
          </Button>
        )}
      </div>
    </div>
  );
}
