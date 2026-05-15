"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Slide {
  /** Public-path image displayed on this slide. */
  image: string;
  /** i18n key under `auth.showcase.slides.<key>` resolving title + description. */
  key: "climate" | "feedback" | "analytics";
  /** Optional rotation applied to the floating screenshot for visual variety. */
  rotate?: string;
}

const SLIDES: Slide[] = [
  {
    image: "/images/screenshots/climate-results.png",
    key: "climate",
    rotate: "-rotate-2",
  },
  {
    image: "/images/platform/platform-dashboard.png",
    key: "feedback",
    rotate: "rotate-1",
  },
  {
    image: "/images/screenshots/analytics-dashboard.png",
    key: "analytics",
    rotate: "-rotate-1",
  },
];

const AUTO_ADVANCE_MS = 6000;

/**
 * Right-panel carousel used on the public auth pages (login / signup).
 *
 * One themed slide at a time: a single floating screenshot above a tagline
 * and short description, with thin progress-pill indicators at the bottom.
 * Auto-advances every 6 seconds; pauses on hover so the reader has time to
 * absorb whichever slide caught their eye.
 */
export function AuthCarousel() {
  const t = useTranslations("auth.login.showcase");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative hidden flex-col overflow-hidden p-12 lg:flex"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #4c2459 0%, #613171 45%, #7a3e8c 100%)",
      }}
    >
      {/* Subtle grid texture, same as the Kezak reference */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Floating screenshot — only one per slide, cross-fades between them */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative h-[460px] w-full max-w-lg">
          {SLIDES.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-700",
                i === active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <div
                className={cn(
                  "overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl",
                  s.rotate,
                )}
              >
                <Image
                  src={s.image}
                  alt=""
                  width={840}
                  height={540}
                  className="h-auto w-full max-w-[460px]"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tagline + description (also cross-fade per slide) */}
      <div className="relative z-10 space-y-4 text-white">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <span className="text-xl font-bold">K</span>
        </div>
        <div className="min-h-[7.5rem]">
          <h2 className="whitespace-pre-line text-3xl font-semibold leading-tight">
            {t(`slides.${slide.key}.title`)}
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/80">
            {t(`slides.${slide.key}.description`)}
          </p>
        </div>

        {/* Progress-pill indicators — clickable to jump */}
        <div className="flex items-center gap-2 pt-2" role="tablist">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={t(`slides.${s.key}.title`)}
              onClick={() => setActive(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active
                  ? "w-12 bg-white"
                  : "w-6 bg-white/40 hover:bg-white/60",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
