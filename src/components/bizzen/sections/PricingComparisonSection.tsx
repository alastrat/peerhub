"use client";

import { useTranslations } from "next-intl";

const FEATURES = [
  "feedback360",
  "climate",
  "people",
  "org",
  "users",
  "admins",
  "templates",
  "csv",
  "support",
  "sso",
  "api",
  "sla",
  "onboarding",
] as const;

const TIERS = ["starter", "growth", "scale"] as const;

export function PricingComparisonSection() {
  const t = useTranslations("precios.comparison");

  return (
    <section
      className="pricing-comparison"
      style={{ padding: "80px 0", backgroundColor: "#fff" }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-9 col-lg-11">
            <div className="section-title text-center mb-50">
              <h2
                className="text-anm"
                style={{ marginBottom: "12px" }}
              >
                {t("title")}
              </h2>
              <p
                style={{ color: "#666", fontSize: "16px" }}
              >
                {t("subtitle")}
              </p>
            </div>

            <div
              style={{
                overflowX: "auto",
                borderRadius: "16px",
                border: "1px solid #eee",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fc" }}>
                    <th
                      style={{
                        padding: "16px 20px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#1a1a2e",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {t("feature_label")}
                    </th>
                    {TIERS.map((tier) => (
                      <th
                        key={tier}
                        style={{
                          padding: "16px 20px",
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#1a1a2e",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {t(`tiers.${tier}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feature, i) => (
                    <tr
                      key={feature}
                      style={{
                        backgroundColor: i % 2 === 0 ? "#fff" : "#fafbfd",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px 20px",
                          color: "#444",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {t(`features.${feature}.label`)}
                      </td>
                      {TIERS.map((tier) => (
                        <td
                          key={tier}
                          style={{
                            padding: "14px 20px",
                            textAlign: "center",
                            color: "#555",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {t(`features.${feature}.${tier}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
