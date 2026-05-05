"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Eye, FileText, ShieldCheck, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClimateSurvey, updateClimateSurvey } from "@/lib/actions/climate-surveys";
import { WallpaperPicker } from "@/components/climate/wallpaper-picker";
import { ImportQuestionsDialog } from "@/components/climate/import-questions-dialog";
import type { ParsedQuestionRow } from "@/lib/utils/climate-questions-csv";
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
  type: "CLIMATE" | "PULSE" | "ENPS";
  isDefault: boolean;
  questionCount: number;
  questions: QuestionRow[];
}

export interface SurveyWizardInitialData {
  id: string;
  name: string;
  description: string | null;
  type: "CLIMATE" | "PULSE" | "ENPS";
  frequency: string;
  isAnonymous: boolean;
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

interface SurveyWizardProps {
  dimensions: DimensionOption[];
  templates?: TemplateOption[];
  mode?: "create" | "edit";
  initialData?: SurveyWizardInitialData;
}

const STEP_KEYS = ["basics", "questions", "preview"] as const;

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
  dimensions,
  templates = [],
  mode = "create",
  initialData,
}: SurveyWizardProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.climate.wizard");
  const STEPS = STEP_KEYS.map((k) => t(`steps.${k}`));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  // Basics
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialData?.templateId ?? "",
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [surveyType, setSurveyType] = useState<"CLIMATE" | "PULSE" | "ENPS">(
    initialData?.type ?? "CLIMATE",
  );
  const [frequency, setFrequency] = useState(initialData?.frequency ?? "ONCE");
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous ?? true);

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

  // Preview navigation: section + per-question cursor
  const [previewSection, setPreviewSection] = useState<"welcome" | "questions" | "thankyou">(
    "welcome",
  );
  const [questionIndex, setQuestionIndex] = useState(0);
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

  const handleTypeChange = (type: "CLIMATE" | "PULSE" | "ENPS") => {
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
    if (step === 1) return questions.length > 0 && questions.every((q) => q.text.trim().length > 0);
    return true;
  };

  const handleSubmit = () => {
    setError(null);
    const payload = {
      name: name.trim(),
      description: description?.trim() || undefined,
      type: surveyType,
      frequency,
      isAnonymous,
      templateId: selectedTemplateId || undefined,
      welcomeTitle: welcomeTitle.trim() || undefined,
      welcomeBody: welcomeBody || undefined,
      welcomeBannerUrl: wallpaper?.style === "image" ? wallpaper.url : welcomeBannerUrl?.trim() || undefined,
      wallpaperConfig: wallpaper as unknown as Record<string, unknown> | undefined,
      colorConfig: colors as unknown as Record<string, unknown>,
      questionsPerPage: questionsPerPage || null,
      welcomeCtaText: welcomeCtaText.trim() || undefined,
      themeColor: themeColor || undefined,
      thankYouTitle: thankYouTitle.trim() || undefined,
      thankYouBody: thankYouBody || undefined,
      thankYouCtaText: thankYouCtaText.trim() || undefined,
      questions: questions.map((q, i) => ({
        text: q.text.trim(),
        type: q.type,
        dimensionId: q.dimensionId || undefined,
        order: i,
        isRequired: q.isRequired,
      })),
    };

    startTransition(async () => {
      const result =
        mode === "edit" && initialData
          ? await updateClimateSurvey(initialData.id, payload)
          : await createClimateSurvey(payload);

      if (result.success) {
        router.push(`/surveys/climate/${result.data?.id}`);
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
      {/* Progress + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  i <= step ? "bg-[#613171] text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i <= step ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-2 hidden h-px w-8 bg-border sm:block" />}
            </div>
          ))}
        </div>
        <NavButtons />
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

      {/* Step 2: Questions — clean builder canvas */}
      {step === 1 && (
        <div className="rounded-xl border bg-muted/40 p-6 sm:p-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {questions.map((q, i) => {
              const isFocused = focusedQuestion === i;
              return (
                <div
                  key={i}
                  onClick={() => setFocusedQuestion(i)}
                  className={cn(
                    "relative rounded-xl bg-white shadow-sm transition-all",
                    isFocused
                      ? "border-l-4 border-l-primary border border-r-border border-t-border border-b-border shadow-md"
                      : "border border-border hover:shadow-md",
                  )}
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <span className="mt-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="flex-1 space-y-3">
                        <Input
                          value={q.text}
                          onChange={(e) => updateQuestion(i, "text", e.target.value)}
                          placeholder="Enter question text..."
                          className="border-0 border-b border-border/60 rounded-none px-0 text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-0"
                        />
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select value={q.type} onValueChange={(v) => updateQuestion(i, "type", v)}>
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
                          <div className="flex items-end justify-between gap-3">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeQuestion(i);
                                  if (focusedQuestion === i) setFocusedQuestion(Math.max(0, i - 1));
                                }}
                                aria-label="Delete question"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  addQuestion();
                  setFocusedQuestion(questions.length);
                }}
                className="h-12 w-12 rounded-full p-0 shadow-sm"
                aria-label="Add question"
              >
                <Plus className="h-5 w-5" />
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
                  setFocusedQuestion(0);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview — editable welcome fields on the left, navigable live preview on the right */}
      {step === 2 &&
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

          return (
            <div className="space-y-4">
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
            </div>
          );
        })()}

    </div>
  );
}
