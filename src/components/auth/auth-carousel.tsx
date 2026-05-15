"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Slide {
  /** Stock image URL (Unsplash, hot-link-friendly). */
  image: string;
  /** i18n key under `auth.login.showcase.slides.<key>`. */
  key: "climate" | "feedback" | "analytics";
}

// Stock photos of corporate / professional people, served straight from
// Unsplash's CDN with `unoptimized` so we don't have to allowlist the
// hostname in next.config.ts. Each URL pins the photo id + crops it to
// a sensible portrait-leaning size for the right-panel composition.
const SLIDES: Slide[] = [
  {
    // Diverse team in a meeting / collaboration setting
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&h=1100&fit=crop&auto=format&q=80",
    key: "climate",
  },
  {
    // Two people reviewing feedback / 1:1 conversation
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&h=1100&fit=crop&auto=format&q=80",
    key: "feedback",
  },
  {
    // Analyst / data professional at a laptop with charts
    image:
      "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=900&h=1100&fit=crop&auto=format&q=80",
    key: "analytics",
  },
];

const AUTO_ADVANCE_MS = 6000;

/**
 * Right-panel auto-advancing showcase used on /login and /signup.
 *
 * Cross-fades through three corporate stock-photo slides with i18n
 * taglines. Auto-advance pauses on hover. Implemented as a single
 * <img> swap (`key`-driven remount) rather than absolute-positioned
 * stacked Next/Image elements — the stacked approach was causing the
 * dev page to enter a render loop and the first image to not paint.
 */
export function AuthCarousel() {
  const t = useTranslations("auth.login.showcase");
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);

  const advance = useCallback(() => {
    setActive((i) => (i + 1) % SLIDES.length);
  }, []);

  // Single interval, independent of pause state — the handler reads the
  // pause flag from a ref so toggling hover doesn't tear down + recreate
  // the timer (the earlier teardown / recreate cycle was a contributor
  // to the apparent re-render loop).
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      advance();
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [advance]);

  const slide = SLIDES[active];

  return (
    <div
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      className="relative hidden flex-col overflow-hidden p-12 lg:flex"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #4c2459 0%, #613171 45%, #7a3e8c 100%)",
      }}
    >
      {/* Subtle grid texture (matches the Kezak reference) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* One image at a time — `key` swaps the element so the browser can
          GC the previous src; the fade is driven by CSS animation on mount
          instead of toggling opacity across multiple hidden siblings. */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative h-[460px] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          {/* Plain <img> on purpose: Unsplash hot-links don't need Next.js
              image optimization for this surface, and rotating between
              Next/Image elements was the source of the dev render loop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={slide.key}
            src={slide.image}
            alt=""
            className="h-full w-full animate-in fade-in duration-700 object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      {/* Tagline + description (re-mounts per slide for the same fade-in) */}
      <div className="relative z-10 space-y-4 text-white">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <span className="text-xl font-bold">K</span>
        </div>
        <div key={slide.key} className="min-h-[7.5rem] animate-in fade-in duration-700">
          <h2 className="whitespace-pre-line text-3xl font-semibold leading-tight">
            {t(`slides.${slide.key}.title`)}
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/80">
            {t(`slides.${slide.key}.description`)}
          </p>
        </div>

        {/* Pill indicators — clickable, current slide widens */}
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
