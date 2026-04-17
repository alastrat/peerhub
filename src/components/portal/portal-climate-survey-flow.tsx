"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, ShieldCheck } from "lucide-react";
import type { WallpaperConfig, ColorConfig } from "@/lib/utils/wallpaper";
import { getWallpaperCSS, parseWallpaperConfig, parseColorConfig, resolveColors, getContrastBadgeColors } from "@/lib/utils/wallpaper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PortalClimateSurveyForm } from "@/components/portal/portal-climate-survey-form";
import type { SurveyQuestionType } from "@prisma/client";

const DEFAULT_CTA_TEXT = "Comenzar encuesta";
const DEFAULT_THEME_COLOR = "#613171";
const DEFAULT_THANK_YOU_BODY =
  "Gracias por completar nuestra encuesta. Tu opinión es muy valiosa para seguir mejorando nuestro ambiente laboral.";
const DEFAULT_THANK_YOU_CTA = "Ir a Inicio";

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

interface PortalClimateSurveyFlowProps {
  distributionId: string;
  surveyName: string;
  surveyType: string;
  isAnonymous: boolean;
  welcomeTitle: string | null;
  welcomeBody: string | null;
  welcomeBannerUrl: string | null;
  welcomeCtaText: string | null;
  themeColor: string | null;
  wallpaperConfig: unknown;
  colorConfig: unknown;
  thankYouTitle: string | null;
  thankYouBody: string | null;
  thankYouCtaText: string | null;
  questionsPerPage: number | null;
  dueDateLabel: string;
  daysLeft: number;
  isOverdue: boolean;
  questions: Question[];
  draftAnswers: Record<string, { ratingValue?: number; textValue?: string }>;
  /** Preview mode: no authentication, no draft saves, submit is a no-op. */
  previewMode?: boolean;
}

export function PortalClimateSurveyFlow({
  distributionId,
  surveyName,
  surveyType,
  isAnonymous,
  welcomeTitle,
  welcomeBody,
  welcomeBannerUrl,
  welcomeCtaText,
  themeColor,
  wallpaperConfig: rawWallpaperConfig,
  colorConfig: rawColorConfig,
  thankYouTitle,
  thankYouBody,
  thankYouCtaText,
  questionsPerPage: questionsPerPageProp,
  dueDateLabel,
  daysLeft,
  isOverdue,
  questions,
  draftAnswers,
  previewMode = false,
}: PortalClimateSurveyFlowProps) {
  const router = useRouter();
  const [stage, setStage] = useState<"welcome" | "form" | "thankyou">("welcome");
  const [consentAccepted, setConsentAccepted] = useState(false);

  const resolvedTitle = welcomeTitle?.trim() || surveyName;
  const resolvedCta = welcomeCtaText?.trim() || DEFAULT_CTA_TEXT;

  // Color scheme
  const colors = resolveColors(parseColorConfig(rawColorConfig), themeColor || undefined);
  const accent = colors.buttons;

  // Build wallpaper CSS — backward compat with welcomeBannerUrl
  const parsedWallpaper: WallpaperConfig | null =
    parseWallpaperConfig(rawWallpaperConfig) ??
    (welcomeBannerUrl ? { style: "image", url: welcomeBannerUrl } : null);
  const headerCSS = getWallpaperCSS(parsedWallpaper, accent);
  const badgeColors = getContrastBadgeColors(parsedWallpaper, accent);

  const resolvedThankYouTitle = thankYouTitle?.trim() || surveyName;
  const resolvedThankYouBody = thankYouBody?.trim() || DEFAULT_THANK_YOU_BODY;
  const resolvedThankYouCta = thankYouCtaText?.trim() || DEFAULT_THANK_YOU_CTA;

  if (stage === "thankyou") {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center px-4"
        style={headerCSS.style}
      >
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
              <ClipboardCheck className="h-12 w-12 text-slate-500" />
              <span
                className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: "#22c55e" }}
              >
                <Check className="h-5 w-5" />
              </span>
            </div>
            <h2
              className="text-xl font-semibold"
              style={{ color: colors.titleText }}
            >
              {resolvedThankYouTitle}
            </h2>
            <p
              className="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ color: colors.pageText }}
            >
              {resolvedThankYouBody}
            </p>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                if (previewMode) {
                  setStage("welcome");
                } else {
                  router.push("/portal/home");
                  router.refresh();
                }
              }}
              className="mt-6"
              style={{ backgroundColor: colors.buttons, color: colors.buttonText }}
            >
              {resolvedThankYouCta}
            </Button>
            {previewMode && (
              <p className="mt-3 text-xs text-muted-foreground">
                Preview mode — click above to restart from the welcome screen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "form") {
    return (
      <div
        className="min-h-screen w-full px-4 py-8 space-y-6"
        style={headerCSS.style}
      >
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Header bar */}
          <div className="flex items-center gap-4 rounded-xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setStage("welcome")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
              aria-label="Back to welcome"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1
                className="text-sm font-semibold"
                style={{ color: colors.titleText }}
              >
                {resolvedTitle}
              </h1>
              <p className="text-xs text-muted-foreground">Vence el {dueDateLabel}</p>
            </div>
          </div>

          <PortalClimateSurveyForm
            distributionId={distributionId}
            questions={questions}
            draftAnswers={draftAnswers}
            onSubmitted={() => setStage("thankyou")}
            previewMode={previewMode}
            accentColor={accent}
            questionsPerPage={questionsPerPageProp ?? 0}
          />
        </div>
      </div>
    );
  }

  // Welcome stage — wallpaper IS the page background
  return (
    <div
      className="min-h-screen w-full px-4 py-8 space-y-6"
      style={headerCSS.style}
    >
      <div className="flex items-center gap-4">
        {!previewMode && (
          <Link href="/portal/home">
            <Button variant="ghost" size="icon" aria-label="Back to portal home">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">
            {previewMode ? "Preview" : "Encuesta"}
          </p>
        </div>
        {isAnonymous && (
          <Badge
            className="gap-1 border-0"
            style={{ backgroundColor: badgeColors.bg, color: badgeColors.text }}
          >
            <ShieldCheck className="h-3 w-3" />
            Tu respuesta es 100% confidencial
          </Badge>
        )}
      </div>

      <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{surveyType}</Badge>
            {isOverdue ? (
              <Badge variant="destructive">Vencida</Badge>
            ) : daysLeft <= 3 ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {daysLeft} día{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Vence el {dueDateLabel}</span>
            )}
          </div>

          <h1
            className="text-3xl font-semibold"
            style={{ color: colors.titleText }}
          >
            {resolvedTitle}
          </h1>

          {welcomeBody ? (
            <p
              className="whitespace-pre-wrap text-base leading-relaxed"
              style={{ color: colors.pageText }}
            >
              {welcomeBody}
            </p>
          ) : (
            <p
              className="text-base leading-relaxed"
              style={{ color: colors.pageText }}
            >
              Estamos muy interesados en conocer tu opinión. Tus respuestas nos
              ayudarán a identificar oportunidades de mejora y a seguir construyendo
              un mejor ambiente de trabajo.
            </p>
          )}

          {/* Data consent checkbox — must be checked to proceed */}
          {isAnonymous && (
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border bg-muted/30 p-4">
              <Checkbox
                checked={consentAccepted}
                onCheckedChange={(v) => setConsentAccepted(v === true)}
                className="mt-0.5"
              />
              <span
                className="text-sm leading-relaxed"
                style={{ color: colors.pageText }}
              >
                Al responder esta encuesta, autorizo el tratamiento de mis datos
                con fines de análisis de clima organizacional. Mis respuestas serán
                confidenciales y los resultados se reportarán de forma agregada,
                sin identificación individual.
              </span>
            </label>
          )}

          <Button
            type="button"
            size="lg"
            onClick={() => setStage("form")}
            disabled={isAnonymous && !consentAccepted}
            style={{
              backgroundColor: isAnonymous && !consentAccepted ? undefined : colors.buttons,
              color: isAnonymous && !consentAccepted ? undefined : colors.buttonText,
            }}
          >
            {resolvedCta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
