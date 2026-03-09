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
      <div className="text-center mb-50" data-aos="fade-up" data-aos-duration="600">
        <h3
          style={{
            fontFamily: "var(--font-kanit), sans-serif",
            fontWeight: 600,
            color: "var(--kultiva-ink, #1f1a14)",
            position: "relative",
            display: "inline-block",
            paddingBottom: "12px",
          }}
        >
          {t(`${serviceKey}.help_section_title`)}
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "60px",
              height: "3px",
              backgroundColor: "var(--kultiva-secondary, #c96b3c)",
              borderRadius: "2px",
            }}
          />
        </h3>
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
              <h5 className="service-help-card-title">
                {card.title}
              </h5>
              <p className="service-help-card-text">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Quote */}
      <div className="text-center mt-50" data-aos="fade-up" data-aos-duration="800">
        <blockquote
          style={{
            fontStyle: "italic",
            fontSize: "1.05rem",
            lineHeight: 1.7,
            color: "var(--kultiva-secondary, #c96b3c)",
            maxWidth: "800px",
            margin: "0 auto",
            padding: "0 20px",
          }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
      </div>
    </div>
  );
}
