"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Eye, FileText, ShieldCheck, ClipboardCheck, Pencil, RefreshCw, Lock, Users, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClimateSurvey, updateClimateSurvey } from "@/lib/actions/climate-surveys";
import { WallpaperPicker } from "@/components/climate/wallpaper-picker";
import { SurveyQuestionsBuilder } from "@/components/climate/survey-questions-builder";
import { ImportQuestionsDialog } from "@/components/climate/import-questions-dialog";
import { DimensionCombobox } from "@/components/climate/dimension-combobox";
import type { ParsedQuestionRow } from "@/lib/utils/climate-questions-import";
import type { WallpaperConfig, ColorConfig } from "@/lib/utils/wallpaper";
import { getWallpaperCSS, parseWallpaperConfig, parseColorConfig, resolveColors, DEFAULT_COLORS } from "@/lib/utils/wallpaper";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  SURVEY_QUESTION_TYPE_LABELS,
  SURVEY_FREQUENCY_LABELS,
} from "@/lib/constants/climate-survey";

interface DimensionOption {
  id: string;
  name: string;
}

type QuestionType = "LIKERT" | "TEXT" | "NPS" | "RATING";

interface QuestionRow {
  text: string;
  type: QuestionType;
  dimensionId: string;
  isRequired: boolean;
}

export interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  type: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE";
  isDefault: boolean;
  questionCount: number;
  questions: QuestionRow[];
}

export interface SurveyWizardInitialData {
  id: string;
  name: string;
  description: string | null;
  type: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE";
  frequency: string;
  isAnonymous: boolean;
  anonymityThreshold: number;
  templateId: string | null;
  welcomeTitle: string | null;
  welcomeBody: string | null;
  welcomeBannerUrl: string | null;
  welcomeCtaText: string | null;
  themeColor: string | null;
  wallpaperConfig: unknown;
  colorConfig: unknown;
  questionsPerPage: number | null;
  thankYouTitle: string | null;
  thankYouBody: string | null;
  thankYouCtaText: string | null;
  questions: QuestionRow[];
}

export interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  title: string | null;
  departmentId: string | null;
}

export interface NamedOption {
  id: string;
  name: string;
}

interface SurveyWizardProps {
  dimensions: DimensionOption[];
  templates?: TemplateOption[];
  mode?: "create" | "edit";
  initialData?: SurveyWizardInitialData;
  employees?: EmployeeOption[];
  departments?: NamedOption[];
  teams?: NamedOption[];
  hubs?: NamedOption[];
  featureHubs?: boolean;
}

const STEP_KEYS = ["basics", "questions", "participants", "preview"] as const;
const STEP_ICONS: Record<(typeof STEP_KEYS)[number], React.ElementType> = {
  basics: FileText,
  questions: ListChecks,
  participants: Users,
  preview: Eye,
};

const DEFAULT_CTA_TEXT = "Comenzar encuesta";
const DEFAULT_THEME_COLOR = "#613171";
const DEFAULT_THANK_YOU_BODY =
  "Gracias por completar nuestra encuesta. Tu opinión es muy valiosa para seguir mejorando nuestro ambiente laboral.";
const DEFAULT_THANK_YOU_CTA = "Ir a Inicio";

// 4-point Spanish Likert scale — matches the portal form
const LIKERT_OPTIONS = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "Casi siempre" },
  { value: 4, label: "Siempre" },
];

export function SurveyWizard({
  dimensions: initialDimensions,
  templates = [],
  mode = "create",
  initialData,
  employees = [],
  departments = [],
  teams = [],
  hubs = [],
  featureHubs = false,
}: SurveyWizardProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.climate.wizard");
  const STEPS = STEP_KEYS.map((k) => t(`steps.${k}`));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [dimensions, setDimensions] = useState<DimensionOption[]>(initialDimensions);

  const handleDimensionCreated = (dim: DimensionOption) => {
    setDimensions((prev) =>
      prev.some((d) => d.id === dim.id) ? prev : [...prev, dim],
    );
  };

  // Basics
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialData?.templateId ?? "",
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [surveyType, setSurveyType] = useState<"CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE">(
    initialData?.type ?? "CLIMATE",
  );
  const [frequency, setFrequency] = useState(initialData?.frequency ?? "ONCE");
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous ?? true);
  const [anonymityThreshold, setAnonymityThreshold] = useState<number>(
    initialData?.anonymityThreshold ?? 5,
  );

  // Questions
  const [questions, setQuestions] = useState<QuestionRow[]>(
    initialData?.questions && initialData.questions.length > 0
      ? initialData.questions
      : [{ text: "", type: "LIKERT", dimensionId: "", isRequired: true }],
  );

  // Welcome page
  const [welcomeTitle, setWelcomeTitle] = useState(initialData?.welcomeTitle ?? "");
  const [welcomeBody, setWelcomeBody] = useState(initialData?.welcomeBody ?? "");
  const [welcomeBannerUrl] = useState(initialData?.welcomeBannerUrl ?? "");
  const [colors, setColors] = useState<ColorConfig>(() => {
    const parsed = parseColorConfig(initialData?.colorConfig);
    return {
      background: parsed?.background || DEFAULT_COLORS.background,
      buttons: parsed?.buttons || initialData?.themeColor || DEFAULT_COLORS.buttons,
      buttonText: parsed?.buttonText || DEFAULT_COLORS.buttonText,
      pageText: parsed?.pageText || DEFAULT_COLORS.pageText,
      titleText: parsed?.titleText || DEFAULT_COLORS.titleText,
    };
  });
  const resolved = resolveColors(colors);

  const [wallpaper, setWallpaper] = useState<WallpaperConfig | null>(() => {
    const parsed = parseWallpaperConfig(initialData?.wallpaperConfig);
    if (parsed) return parsed;
    // Backward compat: existing banner URL → image wallpaper
    if (initialData?.welcomeBannerUrl) return { style: "image", url: initialData.welcomeBannerUrl };
    return null;
  });
  const [welcomeCtaText, setWelcomeCtaText] = useState(initialData?.welcomeCtaText ?? "");
  const [themeColor, setThemeColor] = useState(initialData?.themeColor ?? DEFAULT_THEME_COLOR);

  // Thank-you page
  const [thankYouTitle, setThankYouTitle] = useState(initialData?.thankYouTitle ?? "");
  const [thankYouBody, setThankYouBody] = useState(initialData?.thankYouBody ?? "");
  const [thankYouCtaText, setThankYouCtaText] = useState(initialData?.thankYouCtaText ?? "");

  // Which question card is focused in the builder (highlighted border)
  const [focusedQuestion, setFocusedQuestion] = useState<number | null>(0);

  // Toggle for wallpaper + color customization panel
  const [showCustomization, setShowCustomization] = useState(() => {
    // Auto-open if there's existing wallpaper or color config
    return !!(initialData?.wallpaperConfig || initialData?.colorConfig);
  });

  // Participants step — wizard-scoped selection (not yet persisted to the
  // survey; see TODO at submission time).
  type ParticipantScope = "ALL" | "HUB" | "DEPARTMENT" | "TEAM" | "CUSTOM";
  const [participantScope, setParticipantScope] = useState<ParticipantScope>("CUSTOM");
  const [participantScopeIds, setParticipantScopeIds] = useState<string[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  // Preview navigation: section + per-question cursor
  const [previewSection, setPreviewSection] = useState<"welcome" | "questions" | "thankyou">(
    "welcome",
  );
  const [questionIndex, setQuestionIndex] = useState(0);

  // Step-3 mode: "iframe" shows a browser mockup of the saved survey;
  // "edit" shows the editor panels. Default to iframe whenever a persisted
  // survey id exists (edit mode or post-draft create mode).
  const [previewViewMode, setPreviewViewMode] = useState<"iframe" | "edit">(
    initialData?.id ? "iframe" : "edit",
  );
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);
  // 0 = all on one page; >0 = N questions per page
  const [questionsPerPage, setQuestionsPerPage] = useState(
    initialData?.questionsPerPage ?? 0,
  );
  const questionDisplay = questionsPerPage > 0 ? "paginated" : "all-on-one-page";

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    // Only prefill fields that are empty — don't clobber user edits
    if (!name.trim()) setName(tpl.name);
    if (!description?.trim() && tpl.description) setDescription(tpl.description);
    setSurveyType(tpl.type);
    if (tpl.questions.length > 0) setQuestions(tpl.questions);
  };

  const handleTypeChange = (type: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE") => {
    setSurveyType(type);
    if (mode === "create" && !selectedTemplateId) {
      if (type === "ENPS") {
        setFrequency("QUARTERLY");
      } else if (type === "PULSE") {
        setFrequency("MONTHLY");
      } else {
        setFrequency("ONCE");
      }
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", type: "LIKERT", dimensionId: "", isRequired: true }]);
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
    if (step === 1) {
      // Every question must have non-empty text AND a real dimension assigned.
      // Forcing dimensions matches the section-based editor's contract: there
      // is no "unclassified" persistence path.
      if (questions.length === 0) return false;
      return questions.every(
        (q) => q.text.trim().length > 0 && q.dimensionId.trim().length > 0,
      );
    }
    return true;
  };

  // Track the persisted draft id after the first "Save draft" in create mode,
  // so subsequent saves update the same record instead of creating duplicates.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const effectiveSurveyId = initialData?.id ?? createdId;

  // Build payload from current state. `forDraft=true` filters empty question rows
  // so the user can save mid-edit without tripping the "all questions need text"
  // gate the final submit relies on.
  const buildPayload = (forDraft: boolean) => {
    const rows = forDraft
      ? questions.filter((q) => q.text.trim().length > 0)
      : questions;
    return {
      name: name.trim(),
      description: description?.trim() || undefined,
      type: surveyType,
      frequency,
      isAnonymous,
      anonymityThreshold,
      templateId: selectedTemplateId || undefined,
      welcomeTitle: welcomeTitle.trim() || undefined,
      welcomeBody: welcomeBody || undefined,
      welcomeBannerUrl:
        wallpaper?.style === "image" ? wallpaper.url : welcomeBannerUrl?.trim() || undefined,
      wallpaperConfig: wallpaper as unknown as Record<string, unknown> | undefined,
      colorConfig: colors as unknown as Record<string, unknown>,
      questionsPerPage: questionsPerPage || null,
      welcomeCtaText: welcomeCtaText.trim() || undefined,
      themeColor: themeColor || undefined,
      thankYouTitle: thankYouTitle.trim() || undefined,
      thankYouBody: thankYouBody || undefined,
      thankYouCtaText: thankYouCtaText.trim() || undefined,
      questions: rows.map((q, i) => ({
        text: q.text.trim(),
        type: q.type,
        dimensionId: q.dimensionId || undefined,
        order: i,
        isRequired: q.isRequired,
      })),
    };
  };

  // Snapshot of the last saved state. Used to detect unsaved changes for the
  // beforeunload guard. Initialized after first render so editing initialData
  // doesn't flag as dirty on mount.
  const currentSnapshot = useMemo(
    () => JSON.stringify(buildPayload(false)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      name,
      description,
      surveyType,
      frequency,
      isAnonymous,
      anonymityThreshold,
      selectedTemplateId,
      welcomeTitle,
      welcomeBody,
      welcomeCtaText,
      themeColor,
      thankYouTitle,
      thankYouBody,
      thankYouCtaText,
      wallpaper,
      colors,
      questionsPerPage,
      questions,
    ],
  );
  const savedSnapshotRef = useRef<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = currentSnapshot;
      setSavedSnapshot(currentSnapshot);
    }
  }, [currentSnapshot]);
  const isDirty = savedSnapshot !== null && savedSnapshot !== currentSnapshot;

  // Native browser warning when the user tries to close/reload with unsaved
  // edits. Modern browsers ignore the custom message and show their own.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const canSaveDraft =
    name.trim().length > 0 &&
    questions.some((q) => q.text.trim().length > 0) &&
    !isPending;

  const handleSaveDraft = () => {
    if (!canSaveDraft) return;
    setError(null);
    const payload = buildPayload(true);
    startTransition(async () => {
      const result = effectiveSurveyId
        ? await updateClimateSurvey(effectiveSurveyId, payload)
        : await createClimateSurvey(payload);
      if (result.success) {
        if (!effectiveSurveyId && result.data?.id) setCreatedId(result.data.id);
        const snapshot = currentSnapshot;
        savedSnapshotRef.current = snapshot;
        setSavedSnapshot(snapshot);
        toast.success(t("actions.draft_saved"));
      } else {
        setError(result.error || "Failed to save draft");
      }
    });
  };

  const handleSubmit = () => {
    setError(null);
    const payload = buildPayload(false);

    startTransition(async () => {
      const result = effectiveSurveyId
        ? await updateClimateSurvey(effectiveSurveyId, payload)
        : await createClimateSurvey(payload);

      if (result.success) {
        const snapshot = currentSnapshot;
        savedSnapshotRef.current = snapshot;
        setSavedSnapshot(snapshot);
        router.push(`/surveys/climate/${result.data?.id ?? effectiveSurveyId}`);
        router.refresh();
      } else {
        setError(result.error || `Failed to ${mode === "edit" ? "update" : "create"} survey`);
      }
    });
  };

  const resolvedTitle = welcomeTitle.trim() || name.trim() || "(Untitled survey)";
  const resolvedCta = welcomeCtaText.trim() || DEFAULT_CTA_TEXT;
  const accent = resolved.buttons;
  const resolvedThankYouTitle = thankYouTitle.trim() || name.trim() || "(Untitled survey)";
  const resolvedThankYouBody = thankYouBody.trim() || DEFAULT_THANK_YOU_BODY;
  const resolvedThankYouCta = thankYouCtaText.trim() || DEFAULT_THANK_YOU_CTA;

  const NavButtons = () => (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => (step === 0 ? router.push("/surveys/climate") : setStep(step - 1))}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {step === 0 ? t("actions.cancel") : t("actions.previous")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSaveDraft}
        disabled={!canSaveDraft || !isDirty}
        title={!canSaveDraft ? t("actions.save_draft_disabled_hint") : undefined}
      >
        <Save className="mr-2 h-4 w-4" />
        {isPending ? t("actions.saving") : t("actions.save_draft")}
      </Button>
      {step < STEPS.length - 1 ? (
        <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
          {t("actions.next")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button size="sm" onClick={handleSubmit} disabled={isPending || !canProceed()}>
          {isPending
            ? t("actions.saving")
            : mode === "edit"
              ? t("actions.save_changes")
              : t("actions.create_survey")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress indicator (pill-style, matches the 360° wizard).
          Navigation buttons live at the bottom of the page, below the
          active step's content, so they don't compete with the step pills. */}
      <div className="flex flex-wrap items-center">
        {STEP_KEYS.map((key, i) => {
          const Icon = STEP_ICONS[key];
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={key} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (isDone) setStep(i);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden text-sm sm:inline">{STEPS[i]}</span>
              </button>
              {i < STEP_KEYS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8",
                    isDone ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Step 1: Basics */}
      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("basics.survey_details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("basics.survey_name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("placeholders.survey_name")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("basics.description_optional")}</Label>
                <Textarea
                  value={description ?? ""}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("placeholders.survey_description")}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("basics.survey_type")}</Label>
                  <Select value={surveyType} onValueChange={(v) => handleTypeChange(v as "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE")}>
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
                <div className="space-y-2">
                  <Label>{t("basics.frequency")}</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SURVEY_FREQUENCY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end space-x-2 pb-1">
                  <Switch id="anonymous" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                  <Label htmlFor="anonymous">{t("basics.anonymous")}</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anonymity-threshold">
                  {t("basics.anonymity_threshold_label")}
                </Label>
                <Input
                  id="anonymity-threshold"
                  type="number"
                  min={1}
                  max={50}
                  value={anonymityThreshold}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setAnonymityThreshold(
                      Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 1,
                    );
                  }}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  {t("basics.anonymity_threshold_hint")}
                </p>
              </div>

              {templates.length > 0 && mode === "create" && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {t("basics.start_from_template")}
                  </Label>
                  <Select
                    value={selectedTemplateId || "blank"}
                    onValueChange={(v) => applyTemplate(v === "blank" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("basics.start_blank")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blank">{t("basics.start_blank")}</SelectItem>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name} (
                          {t(
                            tpl.questionCount === 1
                              ? "basics.questions_count_one"
                              : "basics.questions_count_other",
                            { count: tpl.questionCount },
                          )}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("basics.template_hint")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Questions — section-based editor (sections == dimensions),
          matching the 360° template builder UX. */}
      {step === 1 && (
        <div className="space-y-4">
          <SurveyQuestionsBuilder
            questions={questions}
            dimensions={dimensions}
            onChange={setQuestions}
            onDimensionCreated={handleDimensionCreated}
          />
          <div className="flex justify-end">
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

      {/* Step 3: Participants — pick who will receive the survey (scope +
          optional manual selection). Captured in component state for now;
          a follow-up will persist this as a SurveyDistribution on submit. */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("participants_step.title")}</CardTitle>
            <CardDescription>{t("participants_step.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("participants_step.scope_label")}</Label>
              <Select
                value={participantScope}
                onValueChange={(v) => {
                  setParticipantScope(v as ParticipantScope);
                  setParticipantScopeIds([]);
                  setParticipantIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("participants_step.scope_all")}</SelectItem>
                  {featureHubs && (
                    <SelectItem value="HUB">{t("participants_step.scope_hub")}</SelectItem>
                  )}
                  <SelectItem value="DEPARTMENT">{t("participants_step.scope_department")}</SelectItem>
                  <SelectItem value="TEAM">{t("participants_step.scope_team")}</SelectItem>
                  <SelectItem value="CUSTOM">{t("participants_step.scope_custom")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {participantScope === "ALL" && t("participants_step.scope_all_hint")}
                {participantScope === "HUB" && t("participants_step.scope_hub_hint")}
                {participantScope === "DEPARTMENT" && t("participants_step.scope_department_hint")}
                {participantScope === "TEAM" && t("participants_step.scope_team_hint")}
                {participantScope === "CUSTOM" && t("participants_step.scope_custom_hint")}
              </p>
            </div>

            {participantScope === "HUB" && (
              <ScopeChecklist
                items={hubs}
                selectedIds={participantScopeIds}
                onToggle={(id) =>
                  setParticipantScopeIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  )
                }
                emptyLabel={t("participants_step.no_hubs")}
              />
            )}
            {participantScope === "DEPARTMENT" && (
              <ScopeChecklist
                items={departments}
                selectedIds={participantScopeIds}
                onToggle={(id) =>
                  setParticipantScopeIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  )
                }
                emptyLabel={t("participants_step.no_departments")}
              />
            )}
            {participantScope === "TEAM" && (
              <ScopeChecklist
                items={teams}
                selectedIds={participantScopeIds}
                onToggle={(id) =>
                  setParticipantScopeIds((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                  )
                }
                emptyLabel={t("participants_step.no_teams")}
              />
            )}

            {participantScope === "CUSTOM" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {t("participants_step.selected_count", {
                      selected: participantIds.length,
                      total: employees.length,
                    })}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setParticipantIds(employees.map((e) => e.id))
                      }
                    >
                      {t("participants_step.select_all")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setParticipantIds([])}
                    >
                      {t("participants_step.clear")}
                    </Button>
                  </div>
                </div>
                <div className="max-h-80 space-y-2 overflow-auto rounded-lg border p-3">
                  {employees.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t("participants_step.no_employees")}
                    </p>
                  ) : (
                    employees.map((employee) => {
                      const isSelected = participantIds.includes(employee.id);
                      return (
                        <div
                          key={employee.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setParticipantIds((prev) =>
                              isSelected
                                ? prev.filter((x) => x !== employee.id)
                                : [...prev, employee.id],
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setParticipantIds((prev) =>
                                isSelected
                                  ? prev.filter((x) => x !== employee.id)
                                  : [...prev, employee.id],
                              );
                            }
                          }}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors",
                            isSelected
                              ? "border border-primary/30 bg-primary/10"
                              : "hover:bg-muted",
                          )}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {employee.name
                              ? employee.name
                                  .split(" ")
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {employee.name || employee.email}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {employee.title || t("participants_step.no_title")}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview — editable welcome fields on the left, navigable live preview on the right */}
      {step === 3 &&
        (() => {
          const isWelcome = previewSection === "welcome";
          const isThankYou = previewSection === "thankyou";
          const isQuestions = previewSection === "questions";
          const isPaginated = questionDisplay === "paginated";
          const perPage = isPaginated ? Math.max(questionsPerPage, 1) : questions.length;
          const totalPages = Math.max(1, Math.ceil(questions.length / perPage));
          const safePageIndex = Math.min(Math.max(questionIndex, 0), totalPages - 1);
          const pageQuestions = isPaginated
            ? questions.slice(safePageIndex * perPage, (safePageIndex + 1) * perPage)
            : questions;
          const showQuestionArrows = isQuestions && isPaginated && totalPages > 1;
          const canGoPrev = showQuestionArrows && safePageIndex > 0;
          const canGoNext = showQuestionArrows && safePageIndex < totalPages - 1;
          const slideLabel = isWelcome
            ? t("preview.section_welcome")
            : isThankYou
              ? t("preview.section_thankyou")
              : questions.length === 0
                ? t("preview.slide_no_questions")
                : !isPaginated
                  ? t(
                      questions.length === 1
                        ? "preview.slide_all_questions_one"
                        : "preview.slide_all_questions_other",
                      { count: questions.length },
                    )
                  : t("preview.slide_page_of", {
                      current: safePageIndex + 1,
                      total: totalPages,
                    });

          const showIframe = previewViewMode === "iframe" && effectiveSurveyId;
          const toolbar = (
            <div className="flex items-center justify-end gap-2">
              {showIframe && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIframeRefreshKey((k) => k + 1)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("preview.reload_preview")}
                </Button>
              )}
              <Button
                type="button"
                variant={showIframe ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setPreviewViewMode((m) => (m === "iframe" ? "edit" : "iframe"))
                }
                disabled={previewViewMode === "edit" && !effectiveSurveyId}
              >
                {showIframe ? (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("preview.mode_edit")}
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    {t("preview.mode_preview")}
                  </>
                )}
              </Button>
            </div>
          );
          return (
            <div className="space-y-4">
              {showIframe ? (
                /* Browser-mockup preview of the saved survey */
                <div className="overflow-hidden rounded-xl border bg-background shadow-md">
                  <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-rose-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex flex-1 items-center gap-2 truncate rounded-md border bg-background px-3 py-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3 shrink-0" />
                      <span className="truncate">{`/survey-preview/${effectiveSurveyId}`}</span>
                    </div>
                  </div>
                  <iframe
                    key={iframeRefreshKey}
                    src={`/survey-preview/${effectiveSurveyId}`}
                    title="Survey preview"
                    className="block h-[680px] w-full border-0 bg-white"
                  />
                </div>
              ) : !effectiveSurveyId ? (
                /* Create mode without a draft yet: nothing to iframe. */
                <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                  {t("preview.preview_unavailable")}
                </div>
              ) : null}

              {/* Mode toggle (Edit / Preview + Reload) — kept below the
                  preview/editor content so it never visually competes with
                  the survey it controls. */}

              {/* Editor panels — shown when Edit mode is active */}
              {previewViewMode === "edit" && (
              <>
              {/* Section selector — controls both panels */}
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm text-muted-foreground">{t("preview.editing_label")}</Label>
                <Select
                  value={previewSection}
                  onValueChange={(v) => {
                    setPreviewSection(v as "welcome" | "questions" | "thankyou");
                    if (v === "questions") setQuestionIndex(0);
                  }}
                >
                  <SelectTrigger className="h-9 w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">{t("preview.section_welcome")}</SelectItem>
                    <SelectItem value="questions">{t("preview.section_questions")}</SelectItem>
                    <SelectItem value="thankyou">{t("preview.section_thankyou")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* LEFT: section-specific editor */}
                {isWelcome && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("preview.welcome_card_title")}</CardTitle>
                      <CardDescription>
                        {t("preview.welcome_card_description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Content — always visible */}
                      <div className="space-y-2">
                        <Label>{t("preview.welcome_title_label")}</Label>
                        <Input
                          value={welcomeTitle}
                          onChange={(e) => setWelcomeTitle(e.target.value)}
                          placeholder={name || t("preview.defaults_to_survey_name")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("preview.body_text_label")}</Label>
                        <Textarea
                          value={welcomeBody}
                          onChange={(e) => setWelcomeBody(e.target.value)}
                          placeholder={t("preview.welcome_body_placeholder")}
                          rows={8}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("preview.welcome_body_hint")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("preview.cta_text_label")}</Label>
                        <Input
                          value={welcomeCtaText}
                          onChange={(e) => setWelcomeCtaText(e.target.value)}
                          placeholder={DEFAULT_CTA_TEXT}
                        />
                      </div>

                      {/* Customization toggle */}
                      <div className="pt-2 border-t">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={showCustomization}
                            onCheckedChange={setShowCustomization}
                          />
                          <span className="text-sm font-medium">
                            {t("preview.customize_appearance")}
                          </span>
                        </label>
                      </div>

                      {showCustomization && (
                        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                          {/* Background / wallpaper */}
                          <WallpaperPicker
                            value={wallpaper}
                            onChange={setWallpaper}
                            defaultColor={resolved.buttons}
                          />

                          {/* Colors */}
                          <div className="pt-2 border-t">
                            <Label className="text-xs text-muted-foreground mb-3 block">
                              {t("preview.colors_section")}
                            </Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {([
                                ["buttons", t("preview.color_buttons"), colors.buttons],
                                ["buttonText", t("preview.color_button_text"), colors.buttonText],
                                ["pageText", t("preview.color_page_text"), colors.pageText],
                                ["titleText", t("preview.color_title_text"), colors.titleText],
                              ] as const).map(([key, label, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={val || DEFAULT_COLORS[key]}
                                    onChange={(e) =>
                                      setColors((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    className="h-8 w-10 cursor-pointer rounded border border-input bg-background p-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label className="text-xs">{label}</Label>
                                    <Input
                                      value={val || ""}
                                      onChange={(e) =>
                                        setColors((prev) => ({
                                          ...prev,
                                          [key]: e.target.value,
                                        }))
                                      }
                                      placeholder={DEFAULT_COLORS[key]}
                                      className="h-7 font-mono text-xs"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {isThankYou && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        {t("preview.thankyou_card_title")}
                      </CardTitle>
                      <CardDescription>
                        {t("preview.thankyou_card_description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("preview.thankyou_title_label")}</Label>
                        <Input
                          value={thankYouTitle}
                          onChange={(e) => setThankYouTitle(e.target.value)}
                          placeholder={name || t("preview.defaults_to_survey_name")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("preview.body_text_label")}</Label>
                        <Textarea
                          value={thankYouBody}
                          onChange={(e) => setThankYouBody(e.target.value)}
                          placeholder={DEFAULT_THANK_YOU_BODY}
                          rows={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("preview.cta_text_label")}</Label>
                        <Input
                          value={thankYouCtaText}
                          onChange={(e) => setThankYouCtaText(e.target.value)}
                          placeholder={DEFAULT_THANK_YOU_CTA}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isQuestions && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("preview.questions_card_title")}</CardTitle>
                      <CardDescription>
                        {t("preview.questions_card_description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("preview.questions_per_page_label")}</Label>
                        <Select
                          value={String(questionsPerPage)}
                          onValueChange={(v) => {
                            setQuestionsPerPage(Number(v));
                            setQuestionIndex(0);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">{t("preview.all_on_one_page")}</SelectItem>
                            {Array.from(
                              { length: Math.max(questions.length, 1) },
                              (_, i) => i + 1,
                            ).map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {t("preview.n_per_page", { n })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {t("preview.questions_per_page_hint")}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {(() => {
                          if (questions.length === 0) return t("preview.no_questions_yet");
                          if (questionsPerPage > 0) {
                            const pages = Math.ceil(questions.length / questionsPerPage);
                            return t(
                              questions.length === 1
                                ? "preview.summary_paginated_one"
                                : "preview.summary_paginated_other",
                              { count: questions.length, pages },
                            );
                          }
                          return t(
                            questions.length === 1
                              ? "preview.summary_single_page_one"
                              : "preview.summary_single_page_other",
                            { count: questions.length },
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* RIGHT: live preview panel */}
              <div className="lg:sticky lg:top-4 lg:self-start">
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      {t("preview.live_preview")}
                    </div>
                    {isAnonymous && (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {t("preview.confidential_badge")}
                      </Badge>
                    )}
                  </div>

                  <div
                    className="p-4"
                    style={getWallpaperCSS(wallpaper, accent).style}
                  >
                    {isWelcome ? (
                      // Welcome screen preview — wallpaper bg + centered white card
                      <div className="mx-auto max-w-md overflow-hidden rounded-xl bg-white shadow-lg">
                        <div className="space-y-3 p-5">
                          <h2
                            className="text-lg font-semibold"
                            style={{ color: resolved.titleText }}
                          >
                            {resolvedTitle}
                          </h2>
                          {welcomeBody ? (
                            <p
                              className="whitespace-pre-wrap text-xs leading-relaxed"
                              style={{ color: resolved.pageText }}
                            >
                              {welcomeBody}
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">
                              {t("preview.body_placeholder_preview")}
                            </p>
                          )}
                          <Button
                            type="button"
                            disabled
                            size="sm"
                            className="pointer-events-none"
                            style={{
                              backgroundColor: resolved.buttons,
                              color: resolved.buttonText,
                            }}
                          >
                            {resolvedCta}
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : isThankYou ? (
                      // Thank-you screen preview
                      <div className="flex items-center justify-center p-6">
                        <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-sm">
                          <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                            <ClipboardCheck className="h-7 w-7 text-slate-500" />
                            <span
                              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-white"
                              style={{ backgroundColor: "#22c55e" }}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                          </div>
                          <h2
                            className="text-base font-semibold"
                            style={{ color: resolved.titleText }}
                          >
                            {resolvedThankYouTitle}
                          </h2>
                          <p
                            className="mt-2 whitespace-pre-wrap text-xs"
                            style={{ color: resolved.pageText }}
                          >
                            {resolvedThankYouBody}
                          </p>
                          <Button
                            type="button"
                            disabled
                            size="sm"
                            className="pointer-events-none mt-4"
                            style={{ backgroundColor: resolved.buttons, color: resolved.buttonText }}
                          >
                            {resolvedThankYouCta}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Question preview — handles both display modes
                      questions.length === 0 ? (
                        <div className="p-6 text-center text-sm italic text-muted-foreground">
                          {t("preview.add_questions_hint")}
                        </div>
                      ) : !isPaginated ? (
                        <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">
                          {questions.map((q, i) => (
                            <div
                              key={i}
                              className="space-y-3 rounded-xl bg-white p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    {t("preview.question_label", { n: i + 1 })}
                                  </p>
                                  <h3 className="mt-1 text-sm font-medium leading-snug">
                                    {q.text || (
                                      <em className="text-muted-foreground">{t("preview.empty_question")}</em>
                                    )}
                                    {q.isRequired && (
                                      <span className="text-destructive ml-1">*</span>
                                    )}
                                  </h3>
                                </div>
                                {q.dimensionId && (
                                  <Badge variant="outline" className="shrink-0 text-xs">
                                    {dimensions.find((d) => d.id === q.dimensionId)?.name ?? "—"}
                                  </Badge>
                                )}
                              </div>

                              <div className="pointer-events-none">
                                {q.type === "LIKERT" && (
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {LIKERT_OPTIONS.map((opt) => (
                                      <div
                                        key={opt.value}
                                        className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium"
                                      >
                                        {opt.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === "RATING" && (
                                  <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                      <div
                                        key={v}
                                        className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium"
                                      >
                                        {v}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === "NPS" && (
                                  <div className="grid grid-cols-11 gap-1">
                                    {Array.from({ length: 11 }, (_, v) => (
                                      <div
                                        key={v}
                                        className="rounded-md border border-border px-1.5 py-1.5 text-center text-xs font-medium"
                                      >
                                        {v}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === "TEXT" && (
                                  <Textarea
                                    value=""
                                    readOnly
                                    placeholder="Escribe tu respuesta..."
                                    rows={2}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Paginated: show N questions per page
                        pageQuestions.length > 0 && (
                          <div className="space-y-3 p-4">
                            {pageQuestions.map((q, i) => {
                              const globalIdx = safePageIndex * perPage + i;
                              return (
                                <div key={globalIdx} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        {t("preview.question_label", { n: globalIdx + 1 })}
                                      </p>
                                      <h3 className="mt-1 text-sm font-medium leading-snug">
                                        {q.text || <em className="text-muted-foreground">{t("preview.empty_question")}</em>}
                                        {q.isRequired && <span className="text-destructive ml-1">*</span>}
                                      </h3>
                                    </div>
                                    {q.dimensionId && (
                                      <Badge variant="outline" className="shrink-0 text-xs">
                                        {dimensions.find((d) => d.id === q.dimensionId)?.name ?? "—"}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="pointer-events-none">
                                    {q.type === "LIKERT" && (
                                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {LIKERT_OPTIONS.map((opt) => (
                                          <div key={opt.value} className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium">{opt.label}</div>
                                        ))}
                                      </div>
                                    )}
                                    {q.type === "RATING" && (
                                      <div className="grid grid-cols-5 gap-2">
                                        {[1, 2, 3, 4, 5].map((v) => (
                                          <div key={v} className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium">{v}</div>
                                        ))}
                                      </div>
                                    )}
                                    {q.type === "NPS" && (
                                      <div className="grid grid-cols-11 gap-1">
                                        {Array.from({ length: 11 }, (_, v) => (
                                          <div key={v} className="rounded-md border border-border px-1.5 py-1.5 text-center text-xs font-medium">{v}</div>
                                        ))}
                                      </div>
                                    )}
                                    {q.type === "TEXT" && (
                                      <Textarea value="" readOnly placeholder="Escribe tu respuesta..." rows={2} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      )
                    )}
                  </div>

                  {/* Slide label + (questions-only) arrow controls */}
                  <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuestionIndex(Math.max(0, safePageIndex - 1))}
                      disabled={!canGoPrev}
                      aria-label={t("preview.previous_question_aria")}
                      className={cn(!showQuestionArrows && "invisible")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground">
                      {slideLabel}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuestionIndex(Math.min(totalPages - 1, safePageIndex + 1))}
                      disabled={!canGoNext}
                      aria-label={t("preview.next_question_aria")}
                      className={cn(!showQuestionArrows && "invisible")}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>
              </div>
              </>
              )}

              {toolbar}
            </div>
          );
        })()}

      {/* Wizard navigation: stays pinned to the bottom of the page so it
          doesn't compete with the step indicator for attention. */}
      <div className="flex justify-end">
        <NavButtons />
      </div>
    </div>
  );
}

function ScopeChecklist({
  items,
  selectedIds,
  onToggle,
  emptyLabel,
}: {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onToggle(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(item.id);
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors",
              isSelected ? "border border-primary/30 bg-primary/10" : "hover:bg-muted",
            )}
          >
            <Checkbox checked={isSelected} />
            <span className="text-sm">{item.name}</span>
          </div>
        );
      })}
    </div>
  );
}
