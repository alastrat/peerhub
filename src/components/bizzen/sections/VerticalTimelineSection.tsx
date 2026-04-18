"use client";

import { useTranslations } from "next-intl";

interface VerticalTimelineSectionProps {
  namespace: string;
  steps: string[];
  title: string;
  accentColor?: string;
}

export function VerticalTimelineSection({
  namespace,
  steps,
  title,
  accentColor = "#613171",
}: VerticalTimelineSectionProps) {
  const t = useTranslations(namespace);

  return (
    <section
      style={{
        padding: "100px 0",
        backgroundColor: "#fff",
        position: "relative",
      }}
    >
      <div className="container">
        <div className="row">
          {/* Left column: title + illustration placeholder (desktop only) */}
          <div className="col-lg-5">
            <div
              style={{
                position: "sticky",
                top: "120px",
              }}
            >
              <h2
                style={{
                  fontSize: "clamp(28px, 3.5vw, 40px)",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  lineHeight: 1.2,
                  marginBottom: "24px",
                }}
              >
                {t(title)}
              </h2>

              {/* Illustration placeholder (visible on desktop) */}
              <div
                className="d-none d-lg-block"
                style={{
                  marginTop: "40px",
                  backgroundColor: `${accentColor}0D`,
                  borderRadius: "20px",
                  border: `2px dashed ${accentColor}33`,
                  padding: "60px 40px",
                  textAlign: "center",
                }}
              >
                <i
                  className="fas fa-layer-group"
                  style={{
                    fontSize: "48px",
                    color: `${accentColor}66`,
                    marginBottom: "16px",
                    display: "block",
                  }}
                />
                <p
                  style={{
                    fontSize: "14px",
                    color: "#999",
                    margin: 0,
                  }}
                >
                  Illustration placeholder
                </p>
              </div>
            </div>
          </div>

          {/* Right column: timeline steps */}
          <div className="col-lg-7">
            <div style={{ position: "relative", paddingLeft: "48px" }}>
              {/* Dashed vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: "19px",
                  top: "0",
                  bottom: "0",
                  width: "0",
                  borderLeft: `2px dashed ${accentColor}33`,
                  pointerEvents: "none",
                }}
              />

              {steps.map((stepKey, index) => (
                <div
                  key={stepKey}
                  style={{
                    position: "relative",
                    marginBottom: index < steps.length - 1 ? "48px" : "0",
                  }}
                >
                  {/* Numbered circle badge */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-48px",
                      top: "0",
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: accentColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: 700,
                      zIndex: 2,
                      boxShadow: `0 4px 12px ${accentColor}40`,
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Step content card */}
                  <div
                    style={{
                      backgroundColor: "#f8f7fa",
                      borderRadius: "14px",
                      padding: "28px 28px",
                      border: "1px solid #eee",
                      transition: "box-shadow 0.25s ease, transform 0.25s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 8px 24px rgba(0,0,0,0.08)";
                      (e.currentTarget as HTMLDivElement).style.transform =
                        "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLDivElement).style.transform =
                        "translateY(0)";
                    }}
                  >
                    {/* Step label */}
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        color: accentColor,
                        marginBottom: "8px",
                      }}
                    >
                      Paso {index + 1}
                    </span>

                    <h4
                      style={{
                        fontSize: "20px",
                        fontWeight: 600,
                        color: "#1a1a2e",
                        marginBottom: "10px",
                      }}
                    >
                      {t(`${stepKey}.title`)}
                    </h4>

                    <p
                      style={{
                        fontSize: "15px",
                        color: "#666",
                        lineHeight: 1.7,
                        margin: 0,
                      }}
                    >
                      {t(`${stepKey}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
