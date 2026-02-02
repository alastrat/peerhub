"use client";

import { useTranslations } from "next-intl";
import { Counter } from "../ui/Counter";
import { AnimatedElement } from "../ui/AnimatedElement";

const stats = [
  { key: "years", value: 15, suffix: "+" },
  { key: "clients", value: 200, suffix: "+" },
  { key: "projects", value: 500, suffix: "+" },
  { key: "team", value: 25, suffix: "+" },
];

interface CounterSectionProps {
  variant?: "light" | "dark";
}

export function CounterSection({ variant = "dark" }: CounterSectionProps) {
  const t = useTranslations("home.stats");

  const isDark = variant === "dark";

  return (
    <section
      className={`py-16 lg:py-20 ${
        isDark
          ? "bg-kultiva-primary"
          : "bg-kultiva-sand"
      }`}
    >
      <div className="kultiva-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <AnimatedElement
              key={stat.key}
              animation="fade-up"
              delay={index * 100}
            >
              <div className="text-center">
                <div
                  className={`text-4xl lg:text-5xl font-bold mb-2 ${
                    isDark ? "text-white" : "text-kultiva-primary"
                  }`}
                >
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <p
                  className={`text-sm ${
                    isDark ? "text-white/70" : "text-kultiva-charcoal/70"
                  }`}
                >
                  {t(stat.key)}
                </p>
              </div>
            </AnimatedElement>
          ))}
        </div>
      </div>
    </section>
  );
}
