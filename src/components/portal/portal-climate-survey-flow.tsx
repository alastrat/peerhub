"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  ClipboardCheck,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { WallpaperConfig } from "@/lib/utils/wallpaper";
import {
  getWallpaperCSS,
  isDarkWallpaper,
  parseWallpaperConfig,
  parseColorConfig,
  resolveColors,
} from "@/lib/utils/wallpaper";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PortalClimateSurveyForm, PROGRESS_GREEN } from "@/components/portal/portal-climate-survey-form";
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
  /** Who is answering, greeted on the welcome screen (unknown in preview). */
  respondentName?: string | null;
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
  respondentName,
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

  // Welcome stage — a split screen, like a lobby. The left half is a white
  // sheet (the survey's text colors are chosen for white) with the greeting,
  // the survey, what answering it involves, consent and the start button. The
  // right half is the wallpaper with an illustration carrying the logo.
  const hasDueDate = !!dueDateLabel && dueDateLabel !== "—";
  const firstName = respondentName?.trim().split(/\s+/)[0];

  const facts: { icon: LucideIcon; label: string; value: string; urgent?: boolean }[] = [
    { icon: ListChecks, label: t("fact_questions"), value: String(questions.length) },
  ];
  if (isAnonymous) {
    facts.push({ icon: ShieldCheck, label: t("fact_privacy"), value: t("fact_privacy_anonymous") });
  }
  if (hasDueDate) {
    facts.push({
      icon: CalendarClock,
      label: t("fact_due"),
      value: isOverdue
        ? t("overdue")
        : daysLeft <= 3
          ? t("days_left", { count: daysLeft })
          : dueDateLabel,
      urgent: isOverdue,
    });
  }
  if (companyName) {
    facts.push({ icon: Building2, label: t("fact_company"), value: companyName });
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2" style={headerCSS.style}>
      <section
        data-survey-home
        className="flex min-h-screen flex-col bg-white px-6 py-6 sm:px-12 lg:px-16 xl:px-24"
      >
        {!previewMode && (
          <div>
            <Link href="/portal/home">
              <Button variant="ghost" size="icon" aria-label={t("back_home")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        <div className="my-auto w-full max-w-xl space-y-8 py-10">
          {/* On phones the illustration, and the logo on it, is hidden */}
          <div className="lg:hidden">
            <CompanyMasthead logoUrl={logoUrl} companyName={companyName} accent={accent} />
          </div>

          <div className="space-y-3">
            {firstName && (
              <p className="text-lg" style={{ color: colors.pageText }}>
                {t("greeting", { name: firstName })}
              </p>
            )}
            <h1
              className="text-4xl font-bold leading-tight sm:text-5xl"
              style={{ color: colors.titleText }}
            >
              {resolvedTitle}
            </h1>
          </div>

          <WelcomeBody
            text={welcomeBody?.trim() || t("default_welcome_body")}
            color={colors.pageText}
            accent={accent}
          />

          <div className="space-y-3">
            <h2 className="text-base font-semibold" style={{ color: colors.titleText }}>
              {t("facts_title")}
            </h2>
            <dl className="divide-y rounded-xl border bg-muted/40">
              {facts.map(({ icon: Icon, label, value, urgent }) => (
                <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="flex items-center gap-2.5 font-medium" style={{ color: colors.titleText }}>
                    <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden />
                    {label}
                  </dt>
                  <dd
                    className={cn("text-right", urgent && "font-semibold text-destructive")}
                    style={urgent ? undefined : { color: colors.pageText }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-5">
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
          </div>
        </div>

        {companyName && (
          <p className="text-xs text-muted-foreground">
            {t("conducted_with", { company: companyName })}
          </p>
        )}
      </section>

      {/* Pinned, so the illustration stays in view while the text scrolls */}
      <aside aria-hidden className="hidden lg:block">
        <div className="sticky top-0 flex h-screen items-center justify-center p-10 xl:p-16">
          <SurveyIllustration
            logoUrl={logoUrl}
            companyName={companyName}
            accent={accent}
            dark={isDarkWallpaper(parsedWallpaper, accent, platformTheme)}
          />
        </div>
      </aside>
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

const INK = "#1c0930";
const PAPER = "#ffffff";
const LILAC = "#e6e1f2";
const HEATHER = "#b9aed3";

/**
 * The welcome screen's right half: a desk with a laptop showing a survey, a
 * speech bubble and a plant, and a browser window carrying the company's
 * logo. Drawn in white with dark outlines so it reads on dark and light
 * wallpapers; only the sparkles around it follow the wallpaper.
 */
function SurveyIllustration({
  logoUrl,
  companyName,
  accent,
  dark,
}: {
  logoUrl?: string | null;
  companyName?: string | null;
  accent: string;
  dark: boolean;
}) {
  const sparkle = dark ? "rgba(255,255,255,0.55)" : "rgba(36,18,56,0.35)";

  return (
    <div className="relative aspect-square w-full max-w-[560px]">
      <svg
        viewBox="0 0 560 560"
        className="absolute inset-0 h-full w-full"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g stroke={sparkle} strokeWidth="2.5">
          <circle cx="246" cy="104" r="46" strokeDasharray="6 9" />
          <path d="M232 172 C252 124 272 110 298 106" strokeDasharray="6 9" />
          <path d="M44 120v16M36 128h16" />
          <path d="M524 300v16M516 308h16" />
          <path d="M300 486v14M293 493h14" />
          <circle cx="70" cy="80" r="4" />
          <circle cx="540" cy="262" r="4" />
          <circle cx="474" cy="250" r="3" />
          <path d="M30 552H540" />
          <path d="M432 390c-6-8 6-12 0-20M444 390c-6-8 6-12 0-20" />
        </g>

        {/* Plant, behind the end of the desk */}
        <g stroke={INK} strokeWidth="3">
          <path d="M512 492C478 474 474 434 488 414C504 434 514 460 512 492Z" fill={HEATHER} />
          <path d="M512 492C518 454 536 436 552 430C552 458 538 480 512 492Z" fill={LILAC} />
          <path d="M512 492C502 460 508 424 524 404C534 434 528 470 512 492Z" fill={PAPER} />
          <path d="M486 492H538L530 552H494Z" fill={PAPER} />
        </g>

        {/* Desk, laptop and mug */}
        <g stroke={INK} strokeWidth="3">
          <rect x="72" y="456" width="12" height="96" fill={HEATHER} />
          <rect x="428" y="456" width="12" height="96" fill={HEATHER} />
          <rect x="40" y="442" width="430" height="14" rx="4" fill={LILAC} />
          <rect x="150" y="280" width="236" height="150" rx="10" fill={PAPER} />
          <path d="M118 430H418L404 442H132Z" fill={HEATHER} />
          <rect x="424" y="400" width="28" height="42" rx="5" fill={PAPER} />
          <path d="M452 410c14 0 14 22 0 22" />
        </g>
        <rect x="166" y="296" width="204" height="118" rx="6" fill={LILAC} />
        <rect x="182" y="312" width="124" height="8" rx="4" fill={HEATHER} />
        <rect x="182" y="328" width="92" height="8" rx="4" fill={HEATHER} />
        {[182, 226, 270, 314].map((x) => (
          <rect
            key={x}
            x={x}
            y="352"
            width="40"
            height="22"
            rx="11"
            fill={x === 270 ? accent : PAPER}
            stroke={x === 270 ? accent : HEATHER}
            strokeWidth="2"
          />
        ))}
        <rect x="182" y="390" width="172" height="6" rx="3" fill={PAPER} />
        <rect x="182" y="390" width="74" height="6" rx="3" fill={PROGRESS_GREEN} />

        {/* Speech bubble with a check */}
        <path
          d="M74 170H216Q230 170 230 184V242Q230 256 216 256H152L132 282L128 256H74Q60 256 60 242V184Q60 170 74 170Z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="3"
        />
        <circle cx="94" cy="213" r="16" fill={accent} />
        <path d="M86 213l6 6 11-12" stroke={PAPER} strokeWidth="3" />
        <rect x="120" y="200" width="88" height="8" rx="4" fill={HEATHER} />
        <rect x="120" y="218" width="60" height="8" rx="4" fill={LILAC} />
      </svg>

      {/* Browser window with the company's logo */}
      <div
        className="absolute left-[53.5%] top-[5%] flex aspect-[6/5] w-[43%] flex-col overflow-hidden rounded-2xl border-[3px] bg-white shadow-[0_18px_40px_rgba(20,6,34,0.25)]"
        style={{ borderColor: INK }}
      >
        <div
          className="flex h-7 shrink-0 items-center gap-1.5 border-b-[3px] px-3"
          style={{ borderColor: INK, backgroundColor: LILAC }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full border-2" style={{ borderColor: INK }} />
          ))}
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center p-5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={240}
              height={120}
              className="max-h-full w-auto max-w-full object-contain"
              unoptimized
            />
          ) : (
            <CompanyMasthead companyName={companyName} accent={accent} />
          )}
        </div>
      </div>
    </div>
  );
}
