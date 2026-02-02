"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { AnimatedElement } from "../ui/AnimatedElement";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqKeys = ["1", "2", "3", "4", "5"];

export function FAQAccordion() {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="kultiva-section">
      <div className="kultiva-container">
        <div className="max-w-3xl mx-auto">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle={t("subtitle")}
              title={t("title")}
              centered
            />
          </AnimatedElement>

          <div className="space-y-4">
            {faqKeys.map((key, index) => (
              <AnimatedElement
                key={key}
                animation="fade-up"
                delay={100 + index * 50}
              >
                <div className="kultiva-card kultiva-card-bordered p-0 overflow-hidden">
                  <button
                    onClick={() => toggle(index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-kultiva-cream/50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold pr-4">
                      {t(`questions.${key}.question`)}
                    </h3>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-kultiva-primary flex-shrink-0 transition-transform duration-300",
                        openIndex === index && "rotate-180"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-300",
                      openIndex === index
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 text-kultiva-charcoal/70 leading-relaxed">
                        {t(`questions.${key}.answer`)}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
