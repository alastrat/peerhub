"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { TestimonialCard } from "../ui/Card";
import { AnimatedElement } from "../ui/AnimatedElement";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonialImages = [
  "/images/team/testimonial-1.jpg",
  "/images/team/testimonial-2.jpg",
  "/images/clients/fintra-logo.jpg",
];

export function TestimonialSlider() {
  const t = useTranslations("home.testimonials");
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      quote: t("items.1.quote"),
      author: t("items.1.name"),
      role: t("items.1.role"),
      company: t("items.1.company"),
      image: testimonialImages[0],
    },
    {
      id: 2,
      quote: t("items.2.quote"),
      author: t("items.2.name"),
      role: t("items.2.role"),
      company: t("items.2.company"),
      image: testimonialImages[1],
    },
    {
      id: 3,
      quote: t("items.3.quote"),
      author: t("items.3.name"),
      role: t("items.3.role"),
      company: t("items.3.company"),
      image: testimonialImages[2],
    },
  ];

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section className="kultiva-section">
      <div className="kultiva-container">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle={t("subtitle")}
              title={t("title")}
              className="mb-0 lg:max-w-xl"
            />
          </AnimatedElement>

          <AnimatedElement animation="fade-up" delay={200}>
            <div className="flex gap-3 mt-6 lg:mt-0">
              <button
                onClick={prev}
                className="w-12 h-12 rounded-xl border border-kultiva-border flex items-center justify-center hover:bg-kultiva-primary hover:border-kultiva-primary hover:text-white transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="w-12 h-12 rounded-xl border border-kultiva-border flex items-center justify-center hover:bg-kultiva-primary hover:border-kultiva-primary hover:text-white transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </AnimatedElement>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <AnimatedElement
              key={testimonial.id}
              animation="fade-up"
              delay={100 + index * 100}
            >
              <TestimonialCard
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                company={testimonial.company}
                image={testimonial.image}
                className={
                  index === currentIndex
                    ? "ring-2 ring-kultiva-primary"
                    : ""
                }
              />
            </AnimatedElement>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === currentIndex
                  ? "bg-kultiva-primary"
                  : "bg-kultiva-border hover:bg-kultiva-stone"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
