"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";
import { ArrowLeft, CalendarClock, Check, ClipboardCheck, ListChecks, ShieldCheck } from "lucide-react";
import type { WallpaperConfig } from "@/lib/utils/wallpaper";
import { getWallpaperCSS, parseWallpaperConfig, parseColorConfig, resolveColors } from "@/lib/utils/wallpaper";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PortalClimateSurveyForm } from "@/components/portal/portal-climate-survey-form";
import type { PlatformTheme } from "@/lib/constants/platform-theme";
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
  /** The survey's own logo, else its company's. */
  logoUrl?: string | null;
  /** The company running the survey, named on the welcome screen. */
  companyName?: string | null;
  questionsPerPage: number | null;
  dueDateLabel: string;
  daysLeft: number;
  isOverdue: boolean;
  questions: Question[];
  draftAnswers: Record<string, { ratingValue?: number; textValue?: string }>;
  /** Preview mode: no authentication, no draft saves, submit is a no-op. */
  previewMode?: boolean;
  /** Supplies the default colors and backdrop the survey doesn't set itself. */
  platformTheme?: PlatformTheme;
}

export function PortalClimateSurveyFlow({
  distributionId,
  surveyName,
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
  logoUrl,
  companyName,
  questionsPerPage: questionsPerPageProp,
  dueDateLabel,
  daysLeft,
  isOverdue,
  questions,
  draftAnswers,
  previewMode = false,
  platformTheme = "classic",
}: PortalClimateSurveyFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("portal.climate_survey");

  // Stage lives in the URL (?stage=form|thankyou) so a refresh keeps the
  // respondent on the screen they were on. Default is the welcome screen.
  const stageParam = searchParams?.get("stage");
  const stage: "welcome" | "form" | "thankyou" =
    stageParam === "form" || stageParam === "thankyou" ? stageParam : "welcome";

  const consentKey = `survey-consent:${distributionId}`;
  const [consentAccepted, setConsentAccepted] = useState(false);

  const setStage = useCallback(
    (next: "welcome" | "form" | "thankyou") => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next === "welcome") params.delete("stage");
      else params.set("stage", next);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Hydrate consent + auto-skip welcome on refresh if the respondent already
  // accepted. Preview mode never persists consent (testers want to re-see the
  // welcome flow on every preview load).
  useEffect(() => {
    if (previewMode) return;
    if (typeof window === "undefined") return;
    const accepted = window.localStorage.getItem(consentKey) === "1";
    if (!accepted) return;
    // localStorage only exists after mount; reading it during render would
    // make the server and client markup disagree
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsentAccepted(true);
    if (stage === "welcome") setStage("form");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentKey, previewMode]);

  // Celebrate completion with a brief confetti burst whenever we land on the
  // thank-you screen (including on a direct ?stage=thankyou refresh).
  useEffect(() => {
    if (stage !== "thankyou") return;
    if (typeof window === "undefined") return;
    const end = Date.now() + 800;
    const colors = ["#a78bfa", "#22c55e", "#fbbf24", "#f472b6"];
    const tick = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, [stage]);

  const resolvedTitle = welcomeTitle?.trim() || surveyName;
  const resolvedCta = welcomeCtaText?.trim() || t("default_cta");

  // Color scheme
  const colors = resolveColors(
    parseColorConfig(rawColorConfig),
    themeColor || undefined,
    platformTheme,
  );
  const accent = colors.buttons;

  // Build wallpaper CSS — backward compat with welcomeBannerUrl
  const parsedWallpaper: WallpaperConfig | null =
    parseWallpaperConfig(rawWallpaperConfig) ??
    (welcomeBannerUrl ? { style: "image", url: welcomeBannerUrl } : null);
  const headerCSS = getWallpaperCSS(parsedWallpaper, accent, platformTheme);

  const resolvedThankYouTitle = thankYouTitle?.trim() || surveyName;
  const resolvedThankYouBody = thankYouBody?.trim() || t("default_thank_you_body");
  const resolvedThankYouCta = thankYouCtaText?.trim() || t("default_thank_you_cta");

  if (stage === "thankyou") {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center px-4"
        style={headerCSS.style}
      >
        <Card data-survey-panel className="w-full max-w-md">
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
                {t("preview_restart_hint")}
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
        className="min-h-screen w-full"
        style={headerCSS.style}
      >
        <PortalClimateSurveyForm
          distributionId={distributionId}
          questions={questions}
          draftAnswers={draftAnswers}
          onSubmitted={() => setStage("thankyou")}
          previewMode={previewMode}
          accentColor={accent}
          questionsPerPage={questionsPerPageProp ?? 0}
          logoUrl={logoUrl}
          surveyName={resolvedTitle}
          dueDateLabel={dueDateLabel}
          onBackToWelcome={() => setStage("welcome")}
        />
      </div>
    );
  }

  // Welcome stage — wallpaper IS the page background. The card reads as an
  // invitation from the company: its logo leads, then the survey and what
  // answering it involves, then consent and the start button.
  const hasDueDate = !!dueDateLabel && dueDateLabel !== "—";

  return (
    <div
      className="min-h-screen w-full space-y-6 px-4 py-8"
      style={headerCSS.style}
    >
      {!previewMode && (
        <div data-survey-topbar className="mx-auto flex max-w-2xl items-center">
          <Link href="/portal/home">
            <Button variant="ghost" size="icon" aria-label={t("back_home")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      <div data-survey-panel className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="space-y-6 p-6 sm:p-10">
          <CompanyMasthead logoUrl={logoUrl} companyName={companyName} accent={accent} />

          <div className="space-y-4">
            <h1
              className="text-3xl font-semibold leading-tight sm:text-4xl"
              style={{ color: colors.titleText }}
            >
              {resolvedTitle}
            </h1>

            <ul
              className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
              style={{ color: colors.pageText }}
            >
              <li className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden />
                {t("questions_count", { count: questions.length })}
              </li>
              {isAnonymous && (
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden />
                  {t("anonymous_badge")}
                </li>
              )}
              {hasDueDate && (
                <li
                  className={cn("flex items-center gap-2", isOverdue && "font-semibold text-destructive")}
                >
                  <CalendarClock
                    className="h-4 w-4 shrink-0"
                    style={isOverdue ? undefined : { color: accent }}
                    aria-hidden
                  />
                  {isOverdue
                    ? t("overdue")
                    : daysLeft <= 3
                      ? t("days_left", { count: daysLeft })
                      : t("due_on", { date: dueDateLabel })}
                </li>
              )}
            </ul>
          </div>

          <div className="border-t pt-6">
            <WelcomeBody
              text={welcomeBody?.trim() || t("default_welcome_body")}
              color={colors.pageText}
              accent={accent}
            />
          </div>
        </div>

        <div className="space-y-5 border-t bg-muted/40 p-6 sm:px-10 sm:py-8">
          {/* Data consent checkbox — must be checked to proceed */}
          {isAnonymous && (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={consentAccepted}
                onCheckedChange={(v) => setConsentAccepted(v === true)}
                className="mt-0.5"
              />
              <span
                className="text-sm leading-relaxed"
                style={{ color: colors.pageText }}
              >
                {t("consent")}
              </span>
            </label>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                if (!previewMode && typeof window !== "undefined") {
                  window.localStorage.setItem(consentKey, "1");
                }
                setStage("form");
              }}
              disabled={isAnonymous && !consentAccepted}
              style={{ backgroundColor: colors.buttons, color: colors.buttonText }}
            >
              {resolvedCta}
            </Button>
            {companyName && (
              <p className="text-xs text-muted-foreground sm:text-right">
                {t("conducted_with", { company: companyName })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The company's logo, or its initials and name when it has none. */
function CompanyMasthead({
  logoUrl,
  companyName,
  accent,
}: {
  logoUrl?: string | null;
  companyName?: string | null;
  accent: string;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={companyName ?? "Logo"}
        width={240}
        height={64}
        className="h-14 w-auto max-w-[240px] object-contain object-left"
        unoptimized
      />
    );
  }
  if (!companyName) return null;

  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
        style={{ backgroundColor: accent }}
        aria-hidden
      >
        {initials}
      </span>
      <span className="text-lg font-semibold">{companyName}</span>
    </div>
  );
}

const BULLET = /^[-•*]\s+/;

/**
 * Lay out the welcome text the admin typed as plain text. Blank lines split
 * paragraphs. Lines that list points read as a checklist: a paragraph whose
 * lines all start with "-", "•" or "*", the lines after a lead-in ending in
 * ":", or the paragraph that follows such a lead-in.
 */
function WelcomeBody({ text, color, accent }: { text: string; color: string; accent: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);

  const checklist = (items: string[]) => (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden />
          <span>{item.replace(BULLET, "")}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="max-w-prose space-y-4 text-base leading-relaxed" style={{ color }}>
      {blocks.map((lines, i) => {
        const previous = blocks[i - 1];
        const followsLeadIn = !!previous && previous[previous.length - 1].endsWith(":");

        if (lines.length >= 2 && (followsLeadIn || lines.every((line) => BULLET.test(line)))) {
          return <div key={i}>{checklist(lines)}</div>;
        }
        if (lines.length >= 3 && lines[0].endsWith(":")) {
          return (
            <div key={i} className="space-y-2.5">
              <p>{lines[0]}</p>
              {checklist(lines.slice(1))}
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {lines.join("\n")}
          </p>
        );
      })}
    </div>
  );
}
