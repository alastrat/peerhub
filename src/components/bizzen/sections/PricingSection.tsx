"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const TIER_KEYS = ["starter", "growth", "scale"] as const;

const TIER_COLORS: Record<string, string> = {
  starter: "#6366f1",
  growth: "var(--btn-primary-bg)",
  scale: "#1a1a2e",
};

export function PricingSection() {
  const t = useTranslations("home.pricing");

  return (
    <section
      className="platform-pricing"
      style={{ padding: "100px 0", backgroundColor: "#f8f9fc" }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8 col-lg-10">
            <div className="section-title text-center mb-60">
              <span
                className="sub-title anim-fade-up"
              >
                {t("subtitle")}
              </span>
              <h2
                className="text-anm"
                style={{ marginBottom: "0" }}
              >
                {t("title")}
              </h2>
            </div>
          </div>
        </div>

        <div className="row justify-content-center">
          {TIER_KEYS.map((tier, index) => {
            const isPopular = tier === "growth";
            return (
              <div
                key={tier}
                className={`col-lg-4 col-md-6 anim-fade-up anim-delay-${(index + 1) * 100}`}
              >
                <div
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "20px",
                    padding: isPopular ? "40px 32px" : "36px 28px",
                    marginBottom: "24px",
                    border: isPopular
                      ? `2px solid ${TIER_COLORS[tier]}`
                      : "1px solid #eee",
                    position: "relative",
                    transform: isPopular ? "scale(1.04)" : "none",
                    boxShadow: isPopular
                      ? "0 16px 48px rgba(0,0,0,0.1)"
                      : "none",
                    height: "calc(100% - 24px)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-14px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: TIER_COLORS[tier],
                        color: "#fff",
                        padding: "5px 20px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("popular")}
                    </div>
                  )}

                  <div style={{ marginBottom: "20px" }}>
                    <h4
                      style={{
                        fontSize: "22px",
                        fontWeight: 600,
                        color: "#1a1a2e",
                        marginBottom: "8px",
                      }}
                    >
                      {t(`tiers.${tier}.name`)}
                    </h4>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#888",
                        lineHeight: 1.5,
                        margin: 0,
                        minHeight: "42px",
                      }}
                    >
                      {t(`tiers.${tier}.description`)}
                    </p>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: "24px" }}>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#888",
                        verticalAlign: "top",
                        lineHeight: "48px",
                      }}
                    >
                      $
                    </span>
                    <span
                      style={{
                        fontSize: "48px",
                        fontWeight: 800,
                        color: TIER_COLORS[tier],
                        lineHeight: 1,
                      }}
                    >
                      {t(`tiers.${tier}.price`)}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "#888",
                        marginLeft: "4px",
                      }}
                    >
                      /{t("per_user")}
                    </span>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        marginTop: "4px",
                      }}
                    >
                      {t("billing_note")}
                    </div>
                  </div>

                  {/* Features */}
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 28px",
                      flex: 1,
                    }}
                  >
                    {Array.from({ length: tier === "growth" || tier === "scale" ? 7 : 5 }, (_, i) => (
                      <li
                        key={i}
                        style={{
                          padding: "8px 0",
                          fontSize: "14px",
                          color: "#555",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        <i
                          className="fas fa-check"
                          style={{
                            color: TIER_COLORS[tier],
                            fontSize: "12px",
                            marginTop: "4px",
                            flexShrink: 0,
                          }}
                        />
                        {t(`tiers.${tier}.features.${i + 1}`)}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href="/contacto"
                    className={isPopular ? "theme-btn style-one" : ""}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "14px 24px",
                      borderRadius: "10px",
                      fontSize: "15px",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.3s ease",
                      ...(isPopular
                        ? {}
                        : {
                            backgroundColor: "transparent",
                            border: `2px solid ${TIER_COLORS[tier]}30`,
                            color: TIER_COLORS[tier],
                          }),
                    }}
                  >
                    {tier === "scale" ? t("cta_contact") : t("cta")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
