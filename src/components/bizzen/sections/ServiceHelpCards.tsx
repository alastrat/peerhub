"use client";

import { useTranslations } from "next-intl";

interface ServiceHelpCardsProps {
  serviceKey: string;
}

export function ServiceHelpCards({ serviceKey }: ServiceHelpCardsProps) {
  const t = useTranslations("services");

  // Check if this service has help cards
  let hasHelpCards = false;
  try {
    t(`${serviceKey}.help_section_title`);
    hasHelpCards = true;
  } catch {
    return null;
  }

  if (!hasHelpCards) return null;

  const cards = [1, 2, 3, 4, 5, 6].map((n) => ({
    title: t(`${serviceKey}.help_cards.${n}.title`),
    description: t(`${serviceKey}.help_cards.${n}.description`),
  }));

  const quote = t(`${serviceKey}.help_quote`);

  return (
    <div className="help-cards-section mt-80 mb-80">
      {/* Section Title */}
      <div className="section-title text-center mb-50" data-aos="fade-up" data-aos-duration="600">
        <span className="sub-title">{t(`${serviceKey}.help_section_title`)}</span>
      </div>

      {/* Cards Grid */}
      <div className="row">
        {cards.map((card, index) => (
          <div
            key={index}
            className="col-lg-4 col-md-6 col-sm-12 mb-30"
            data-aos="fade-up"
            data-aos-duration={600 + index * 100}
          >
            <div className="service-help-card">
              <h5 className="service-help-card-title">{card.title}</h5>
              <p className="service-help-card-text">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quote */}
      <div className="text-center mt-50" data-aos="fade-up" data-aos-duration="800">
        <blockquote className="service-help-quote">
          &ldquo;{quote}&rdquo;
        </blockquote>
      </div>
    </div>
  );
}
