"use client";

import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { AnimatedElement } from "../ui/AnimatedElement";
import { Search, Target, Rocket, BarChart3 } from "lucide-react";

const steps = [
  { key: "step1", icon: Search, number: "01" },
  { key: "step2", icon: Target, number: "02" },
  { key: "step3", icon: Rocket, number: "03" },
  { key: "step4", icon: BarChart3, number: "04" },
];

export function ProcessSection() {
  const t = useTranslations("home.process");

  return (
    <section className="kultiva-section kultiva-section-gray">
      <div className="kultiva-container">
        <AnimatedElement animation="fade-up">
          <SectionTitle
            subtitle={t("subtitle")}
            title={t("title")}
            centered
          />
        </AnimatedElement>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <AnimatedElement
              key={step.key}
              animation="fade-up"
              delay={100 + index * 100}
            >
              <div className="relative text-center group">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-kultiva-border" />
                )}

                {/* Step number & icon */}
                <div className="relative inline-flex flex-col items-center mb-6">
                  <span className="text-6xl font-bold text-kultiva-primary/10 mb-2">
                    {step.number}
                  </span>
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center group-hover:bg-kultiva-primary group-hover:text-white transition-colors">
                    <step.icon className="w-7 h-7 text-kultiva-primary group-hover:text-white transition-colors" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-3">
                  {t(`${step.key}.title`)}
                </h3>
                <p className="text-kultiva-charcoal/70 text-sm leading-relaxed">
                  {t(`${step.key}.description`)}
                </p>
              </div>
            </AnimatedElement>
          ))}
        </div>
      </div>
    </section>
  );
}
