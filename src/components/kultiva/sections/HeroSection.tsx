"use client";

import { useTranslations } from "next-intl";
import { Button } from "../ui/Button";
import { AnimatedElement } from "../ui/AnimatedElement";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  const t = useTranslations("home.hero");

  return (
    <section
      className="relative min-h-screen flex items-center pt-20 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(29, 107, 63, 0.95), rgba(29, 107, 63, 0.75)), url('/kultiva/images/hero-bg.jpg')`,
      }}
    >
      <div className="kultiva-container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <AnimatedElement animation="fade-up" delay={100}>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-kultiva-accent uppercase tracking-wider mb-6">
                <span className="w-8 h-0.5 bg-kultiva-accent" />
                {t("subtitle")}
              </span>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={200}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                {t("title")}
              </h1>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={300}>
              <p className="text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
                {t("description")}
              </p>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={400}>
              <div className="flex flex-wrap gap-4">
                <Button
                  href="/servicios"
                  variant="secondary"
                  size="lg"
                  className="group"
                >
                  {t("cta_primary")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  href="/contacto"
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-kultiva-primary"
                >
                  {t("cta_secondary")}
                </Button>
              </div>
            </AnimatedElement>
          </div>

          <AnimatedElement
            animation="fade-left"
            delay={500}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-kultiva-accent/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-kultiva-secondary/20 rounded-full blur-3xl" />

              {/* Main image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="/kultiva/images/hero-image.jpg"
                  alt="Consultoria organizacional"
                  className="w-full aspect-[4/3] object-cover"
                />
                {/* Play button overlay for video */}
                <button className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-kultiva-primary ml-1" />
                  </div>
                </button>
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-xl">
                <div className="text-3xl font-bold text-kultiva-primary mb-1">
                  +15
                </div>
                <div className="text-sm text-kultiva-charcoal/70">
                  Anos de Experiencia
                </div>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </div>

      {/* Decorative bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120V60C120 40 240 20 360 20C480 20 600 40 720 50C840 60 960 60 1080 50C1200 40 1320 20 1380 10L1440 0V120H0Z"
            fill="hsl(40 30% 97%)"
          />
        </svg>
      </div>
    </section>
  );
}
