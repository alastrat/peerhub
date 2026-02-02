"use client";

import { useTranslations } from "next-intl";
import { Button } from "../ui/Button";
import { AnimatedElement } from "../ui/AnimatedElement";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  const t = useTranslations("home.cta");

  return (
    <section className="kultiva-section kultiva-section-dark relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="kultiva-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <AnimatedElement animation="fade-right">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                {t("title")}
              </h2>
              <p className="text-white/80 text-lg leading-relaxed mb-8">
                {t("description")}
              </p>
              <Button
                href="/diagnostico-clima"
                variant="secondary"
                size="lg"
                className="group"
              >
                {t("button")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </AnimatedElement>

          <AnimatedElement animation="fade-left" delay={200}>
            <div className="relative">
              <img
                src="/kultiva/images/cta-image.jpg"
                alt="Plataforma de Diagnostico de Clima"
                className="rounded-2xl shadow-2xl w-full"
              />
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-kultiva-accent/30 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-kultiva-secondary/30 rounded-full blur-2xl" />
            </div>
          </AnimatedElement>
        </div>
      </div>
    </section>
  );
}
