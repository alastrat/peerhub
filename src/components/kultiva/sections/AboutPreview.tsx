"use client";

import { useTranslations } from "next-intl";
import { Button } from "../ui/Button";
import { AnimatedElement } from "../ui/AnimatedElement";
import { Check, ArrowRight } from "lucide-react";

const features = [
  "Metodologias probadas y personalizadas",
  "Equipo de consultores experimentados",
  "Enfoque centrado en las personas",
  "Resultados medibles y sostenibles",
];

export function AboutPreview() {
  const t = useTranslations("home.about");

  return (
    <section className="kultiva-section">
      <div className="kultiva-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image Side */}
          <AnimatedElement animation="fade-right">
            <div className="relative">
              {/* Main image */}
              <div className="relative rounded-3xl overflow-hidden">
                <img
                  src="/images/team/iskya-speaking.jpg"
                  alt="Sobre Kultiva"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>

              {/* Experience badge */}
              <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-kultiva-primary text-white rounded-2xl p-6 shadow-xl">
                <div className="text-4xl font-bold mb-1">15+</div>
                <div className="text-sm text-white/80">
                  Anos transformando<br />organizaciones
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-kultiva-accent/30 rounded-full blur-2xl" />
            </div>
          </AnimatedElement>

          {/* Content Side */}
          <div>
            <AnimatedElement animation="fade-up">
              <span className="kultiva-subtitle">{t("subtitle")}</span>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={100}>
              <h2 className="kultiva-title">{t("title")}</h2>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={200}>
              <p className="kultiva-lead mb-8">{t("description")}</p>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={300}>
              <ul className="space-y-4 mb-8">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-kultiva-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-kultiva-primary" />
                    </span>
                    <span className="text-kultiva-charcoal">{feature}</span>
                  </li>
                ))}
              </ul>
            </AnimatedElement>

            <AnimatedElement animation="fade-up" delay={400}>
              <Button href="/nosotros" className="group">
                {t("cta")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </AnimatedElement>
          </div>
        </div>
      </div>
    </section>
  );
}
