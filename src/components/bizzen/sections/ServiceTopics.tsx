"use client";

import { useTranslations } from "next-intl";

interface ServiceTopicsProps {
  serviceKey: string;
  topicCount?: number;
}

/**
 * Renders the "Temáticas de Formación" chips + quote block.
 * Only used on the liderazgo service page. Hidden if no `topics_title` key
 * is defined for the service (so it doesn't error on other services).
 */
export function ServiceTopics({ serviceKey, topicCount = 7 }: ServiceTopicsProps) {
  const t = useTranslations("services");

  // Guard — if the service has no topics block, don't render anything
  let title: string;
  try {
    title = t(`${serviceKey}.topics_title`);
  } catch {
    return null;
  }
  if (!title) return null;

  const topics = Array.from({ length: topicCount }, (_, i) =>
    t(`${serviceKey}.topics.${i + 1}`)
  );
  const quote = t(`${serviceKey}.topics_quote`);

  return (
    <div
      className="service-topics-wrapper mb-80 p-5 rounded"
      style={{ backgroundColor: "#613171", color: "#fff" }}
      data-aos="fade-up"
      data-aos-duration="1000"
    >
      <h3 className="mb-4 text-white">{title}</h3>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {topics.map((topic, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              backgroundColor: "#b5e267",
              color: "#3a1a49",
              borderRadius: "999px",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            {topic}
          </span>
        ))}
      </div>
      <p
        className="mb-0"
        style={{ fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}
      >
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}
