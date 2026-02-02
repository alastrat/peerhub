"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { TestimonialCard } from "../ui/Card";
import { AnimatedElement } from "../ui/AnimatedElement";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    id: 1,
    quote:
      "El equipo de Kultiva demostro ser confiable y altamente profesional en cada etapa del proyecto.",
    author: "Maria Claudia Buendia",
    role: "Gerente de RRHH",
    company: "Business Integrity Services",
    image: "/kultiva/images/testimonials/person1.jpg",
  },
  {
    id: 2,
    quote:
      "Gracias a Kultiva pudimos reconectarnos con un liderazgo basado en la confianza a traves de una interaccion cercana y coherente.",
    author: "Narly Herrera",
    role: "Jefe de Gestion Humana",
    company: "Constructora Habitat",
    image: "/kultiva/images/testimonials/person2.jpg",
  },
  {
    id: 3,
    quote:
      "Recomiendo ampliamente a Kultiva por su excepcional profesionalismo y pasion en cada proyecto.",
    author: "Denesi Becerra",
    role: "Directora de Talento Humano",
    company: "Fintra SAS",
    image: "/kultiva/images/testimonials/person3.jpg",
  },
];

export function TestimonialSlider() {
  const t = useTranslations("home.testimonials");
  const [currentIndex, setCurrentIndex] = useState(0);

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
