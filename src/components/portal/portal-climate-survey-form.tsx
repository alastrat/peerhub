"use client";

import { useState, useTransition, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Send, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
import {
  saveSurveyDraft,
  submitSurveyResponse,
} from "@/lib/actions/climate-responses";
import type { SurveyQuestionType } from "@prisma/client";

interface Question {
  id: string;
  text: string;
  description: string | null;
  type: SurveyQuestionType;
  isRequired: boolean;
  order: number;
  config: Record<string, unknown> | null;
  dimensionName: string | null;
}

type AnswerMap = Record<string, { ratingValue?: number; textValue?: string }>;

interface PortalClimateSurveyFormProps {
  distributionId: string;
  questions: Question[];
  draftAnswers?: AnswerMap;
  /** If provided, called after a successful submit instead of redirecting to /portal/home. */
  onSubmitted?: () => void;
  /** Preview mode skips autosave and doesn't hit the submit action — just calls onSubmitted. */
  previewMode?: boolean;
  /** Custom accent color (hex) for branded surveys. Falls back to CSS --primary. */
  accentColor?: string;
  /** 0 = all on one page, >0 = paginated with N per page */
  questionsPerPage?: number;
  /** Optional survey-specific logo shown in the sticky header. */
  logoUrl?: string | null;
  /** Survey name shown in the sticky header. */
  surveyName?: string;
  /** Localized due-date label shown in the sticky header. */
  dueDateLabel?: string;
  /** Optional back action from the sticky header (e.g. return to welcome). */
  onBackToWelcome?: () => void;
}

// 4-point Spanish Likert scale per brochure
const LIKERT_OPTIONS = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "Casi siempre" },
  { value: 4, label: "Siempre" },
];

function isAnswered(a: { ratingValue?: number; textValue?: string } | undefined) {
  if (!a) return false;
  if (a.ratingValue != null) return true;
  if (a.textValue && a.textValue.trim().length > 0) return true;
  return false;
}

const DEFAULT_ACCENT = "#613171";

export function PortalClimateSurveyForm({
  distributionId,
  questions,
  draftAnswers,
  onSubmitted,
  previewMode = false,
  accentColor,
  questionsPerPage = 0,
  logoUrl,
  surveyName,
  dueDateLabel,
  onBackToWelcome,
}: PortalClimateSurveyFormProps) {
  const router = useRouter();
  const accent = accentColor || DEFAULT_ACCENT;

  // Pagination
  const isPaginated = questionsPerPage > 0;
  const perPage = isPaginated ? questionsPerPage : questions.length;
  const totalPages = isPaginated ? Math.ceil(questions.length / perPage) : 1;
  const [currentPage, setCurrentPage] = useState(0);

  /** Style object for a selected answer button — branded with accent color */
  const selectedStyle = {
    borderColor: accent,
    backgroundColor: accent + "15",
    color: accent,
  } as const;
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>(draftAnswers || {});

  const requiredQuestions = useMemo(
    () => questions.filter((q) => q.isRequired),
    [questions]
  );

  const totalAnswered = useMemo(
    () => questions.filter((q) => isAnswered(answers[q.id])).length,
    [questions, answers]
  );
  const progress = questions.length > 0 ? (totalAnswered / questions.length) * 100 : 0;

  const missingRequired = requiredQuestions.filter(
    (q) => !isAnswered(answers[q.id])
  );

  const setAnswer = (
    questionId: string,
    value: { ratingValue?: number; textValue?: string }
  ) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...value } }));
  };

  const saveDraft = useCallback(
    async (silent = false) => {
      if (previewMode) {
        if (!silent) toast.info("Preview mode — changes are not saved");
        return;
      }
      setIsSaving(true);
      const payload = Object.entries(answers).map(([questionId, a]) => ({
        questionId,
        ratingValue: a.ratingValue,
        textValue: a.textValue,
      }));
      const result = await saveSurveyDraft({ distributionId, answers: payload });
      setIsSaving(false);
      if (result.success) {
        setLastSaved(new Date());
        if (!silent) toast.success("Progreso guardado");
      } else if (!silent) {
        toast.error(result.error || "No se pudo guardar");
      }
    },
    [answers, distributionId, previewMode]
  );

  // Debounced autosave — saves 2s after the last answer change so
  // refreshing the browser doesn't lose progress.
  useEffect(() => {
    if (previewMode) return;
    if (Object.keys(answers).length === 0) return;
    const timer = setTimeout(() => {
      void saveDraft(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [answers, saveDraft, previewMode]);

  // Last-resort save on browser unload (best-effort, not guaranteed)
  useEffect(() => {
    if (previewMode) return;
    const handleUnload = () => {
      if (Object.keys(answers).length === 0) return;
      const payload = Object.entries(answers).map(([questionId, a]) => ({
        questionId,
        ratingValue: a.ratingValue,
        textValue: a.textValue,
      }));
      // sendBeacon is fire-and-forget — works even during page unload
      navigator.sendBeacon?.(
        "/api/climate-survey/save-draft",
        JSON.stringify({ distributionId, answers: payload }),
      );
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [answers, distributionId, previewMode]);

  const handleSubmit = () => {
    // Preview mode: no network, just fire the onSubmitted callback so the
    // flow can transition to the thank-you screen.
    if (previewMode) {
      onSubmitted?.();
      return;
    }
    startTransition(async () => {
      const payload = Object.entries(answers).map(([questionId, a]) => ({
        questionId,
        ratingValue: a.ratingValue,
        textValue: a.textValue,
      }));
      const result = await submitSurveyResponse({
        distributionId,
        answers: payload,
      });
      if (result.success) {
        if (onSubmitted) {
          onSubmitted();
        } else {
          toast.success("¡Gracias! Tu encuesta fue enviada.");
          router.push("/portal/home");
          router.refresh();
        }
      } else {
        toast.error(result.error || "No se pudo enviar la encuesta");
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Andela-style sticky header: logo + survey name + question counter,
          with a thin accent-coloured progress bar pinned to its bottom edge. */}
      <header className="sticky top-0 z-30 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {onBackToWelcome && (
            <button
              type="button"
              onClick={onBackToWelcome}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={96}
              height={32}
              className="h-7 w-auto shrink-0 object-contain"
              unoptimized
            />
          ) : null}

          <div className="min-w-0 flex-1">
            {surveyName && (
              <p className="truncate text-sm font-semibold">{surveyName}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {totalAnswered} de {questions.length} respondidas
              </span>
              {dueDateLabel && dueDateLabel !== "—" && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">Vence el {dueDateLabel}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              {lastSaved && !isSaving && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Guardado
                </>
              )}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
              style={{ backgroundColor: accent + "15", color: accent }}
            >
              {totalAnswered}/{questions.length}
            </span>
          </div>
        </div>

        <div
          className="relative h-1 w-full overflow-hidden"
          style={{ backgroundColor: accent + "1f" }}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: accent,
            }}
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:py-8">

      {/* Page navigation (top) */}
      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            Página {currentPage + 1} de {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Siguiente
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Questions */}
      {(isPaginated
        ? questions.slice(currentPage * perPage, (currentPage + 1) * perPage)
        : questions
      ).map((q) => {
        const i = questions.indexOf(q);
        const answer = answers[q.id] || {};
        return (
          <Card key={q.id} className="bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pregunta {i + 1} de {questions.length}
                  </p>
                  <CardTitle className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
                    {q.text}
                    {q.isRequired && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </CardTitle>
                  {q.description && (
                    <CardDescription className="mt-2 text-sm">
                      {q.description}
                    </CardDescription>
                  )}
                </div>
                {q.dimensionName && (
                  <Badge variant="outline" className="shrink-0">
                    {q.dimensionName}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {q.type === "LIKERT" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LIKERT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer(q.id, { ratingValue: opt.value })}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                        answer.ratingValue === opt.value
                          ? ""
                          : "border-border hover:bg-muted"
                      )}
                      style={answer.ratingValue === opt.value ? selectedStyle : undefined}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "RATING" && (
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAnswer(q.id, { ratingValue: v })}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                        answer.ratingValue === v
                          ? ""
                          : "border-border hover:bg-muted"
                      )}
                      style={answer.ratingValue === v ? selectedStyle : undefined}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "NPS" && (
                <div className="grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAnswer(q.id, { ratingValue: v })}
                      className={cn(
                        "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                        answer.ratingValue === v
                          ? ""
                          : "border-border hover:bg-muted"
                      )}
                      style={answer.ratingValue === v ? selectedStyle : undefined}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "TEXT" && (
                <Textarea
                  value={answer.textValue || ""}
                  onChange={(e) =>
                    setAnswer(q.id, { textValue: e.target.value })
                  }
                  placeholder="Escribe tu respuesta..."
                  rows={4}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      {(() => {
        const isLastPage = !isPaginated || currentPage >= totalPages - 1;
        return (
          <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-white/90 backdrop-blur p-3 rounded-lg border shadow-sm">
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveDraft(false)}
              disabled={isSaving || isPending}
              style={{ borderColor: accent + "40", color: accent }}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar borrador
            </Button>

            <div className="flex items-center gap-2">
              {isPaginated && currentPage > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
              )}

              {isPaginated && !isLastPage ? (
                <Button
                  type="button"
                  className="text-white"
                  style={{ backgroundColor: accent }}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      disabled={isPending || missingRequired.length > 0}
                      className="text-white"
                      style={{ backgroundColor: accent }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar encuesta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Enviar tus respuestas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Una vez enviada, no podrás modificar tus respuestas. Asegúrate
                        de haber revisado todo antes de continuar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSubmit} disabled={isPending}>
                        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Confirmar envío
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        );
      })()}

      {missingRequired.length > 0 && (
        <div className="flex justify-end">
          <p className="rounded-md bg-white/90 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
            Faltan {missingRequired.length} pregunta
            {missingRequired.length !== 1 ? "s" : ""} obligatoria
            {missingRequired.length !== 1 ? "s" : ""} por responder
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
