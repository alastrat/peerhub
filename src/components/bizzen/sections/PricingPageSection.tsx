"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import React, { Fragment } from "react";
import { plans, pricingSections, isVariablePrice } from "./pricing-data";
import { PricingCardsSection } from "./PricingCardsSection";

export function PricingPageSection() {
  const t = useTranslations("home.pricing");
  const [billingFrequency] = React.useState<"monthly" | "annually">("annually");

  return (
    <div style={{ padding: "0 12px" }}>
      {/* Header */}
      <section style={{ maxWidth: "1140px", margin: "0 auto", paddingTop: "40px" }}>
        <span className="sub-title">{t("subtitle")}</span>
        <h2
          style={{
            marginTop: "8px",
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 700,
            color: "#1a1a2e",
            lineHeight: 1.1,
          }}
        >
          {t("title")}
        </h2>
        <p style={{ marginTop: "24px", maxWidth: "600px", fontSize: "17px", color: "#666", lineHeight: 1.7 }}>
          Precios claros por usuario, sin costos escondidos ni sorpresas. Paga solo por lo que necesitas.
        </p>
      </section>

      {/* Reuse the cards component without its own header */}
      <section id="pricing-overview" style={{ maxWidth: "1140px", margin: "60px auto 0" }}>
        <PricingCardsSection showHeader={false} withBackground={false} />
      </section>

      {/* Comparison table — mobile (accordion) */}
      <section style={{ maxWidth: "1140px", margin: "40px auto 0" }}>
        <div className="d-block d-lg-none" style={{ maxWidth: "480px", margin: "0 auto" }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{ marginBottom: "32px" }}>
              <div style={{ backgroundColor: "#f8f9fc", borderRadius: "12px", padding: "20px", border: "1px solid #eee" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a2e" }}>{plan.name}</h3>
                <p style={{ fontSize: "13px", color: "#888" }}>
                  {isVariablePrice(plan.price)
                    ? `${billingFrequency === "monthly" ? plan.price.monthly : plan.price.annually} / usuario`
                    : plan.price}
                </p>
              </div>
              <ul style={{ listStyle: "none", padding: 0, marginTop: "20px" }}>
                {pricingSections.map((section) => (
                  <li key={section.name} style={{ marginBottom: "20px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", marginBottom: "8px" }}>
                      {section.name}
                    </h4>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {section.features.map((feature) =>
                        feature.plans[plan.name] ? (
                          <li
                            key={feature.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 0",
                              borderBottom: "1px solid #f0f0f0",
                              fontSize: "14px",
                              color: "#333",
                            }}
                          >
                            <i className="fas fa-check" style={{ fontSize: "11px", color: "#613171", flexShrink: 0 }} />
                            <span>
                              {feature.name}
                              {typeof feature.plans[plan.name] === "string" && (
                                <span style={{ color: "#888", marginLeft: "4px" }}>
                                  ({feature.plans[plan.name]})
                                </span>
                              )}
                            </span>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table — desktop (sticky header) */}
      <section style={{ maxWidth: "1140px", margin: "40px auto 0" }}>
        <div className="d-none d-lg-block">
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                height: "100px",
                width: "100%",
                backgroundColor: "#fff",
                paddingTop: "40px",
              }}
            >
              <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#1a1a2e" }}>
                Compara los planes en detalle
              </h2>
            </div>

            <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, textAlign: "left" }}>
              <colgroup>
                <col style={{ width: "40%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead style={{ position: "sticky", top: "100px" }}>
                <tr>
                  <th style={{ borderBottom: "1px solid #eee", backgroundColor: "#fff", paddingBottom: "24px" }}>
                    <div style={{ fontWeight: 600, color: "#1a1a2e" }}>Característica</div>
                    <div style={{ fontSize: "13px", color: "#888", fontWeight: 400 }}>
                      Precio por mes (facturación {billingFrequency === "annually" ? "anual" : "mensual"})
                    </div>
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      style={{ borderBottom: "1px solid #eee", backgroundColor: "#fff", paddingBottom: "24px", paddingLeft: "24px" }}
                    >
                      <div style={{ fontWeight: 600, color: plan.isRecommended ? "#613171" : "#1a1a2e" }}>{plan.name}</div>
                      <div style={{ fontSize: "13px", color: "#888", fontWeight: 400 }}>
                        {isVariablePrice(plan.price)
                          ? `${billingFrequency === "monthly" ? plan.price.monthly : plan.price.annually} / usuario`
                          : plan.price}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricingSections.map((section, sectionIdx) => (
                  <Fragment key={section.name}>
                    <tr>
                      <th
                        colSpan={4}
                        style={{
                          paddingTop: sectionIdx === 0 ? "48px" : "36px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid #eee",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#1a1a2e",
                        }}
                      >
                        {section.name}
                      </th>
                    </tr>
                    {section.features.map((feature) => (
                      <tr
                        key={feature.name}
                        style={{ transition: "background-color 0.15s" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(97,49,113,0.03)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }}
                      >
                        <th
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: "14px 0",
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#333",
                          }}
                        >
                          {feature.name}
                        </th>
                        {plans.map((plan) => (
                          <td
                            key={plan.name}
                            style={{ borderBottom: "1px solid #f0f0f0", padding: "14px 24px" }}
                          >
                            {typeof feature.plans[plan.name] === "string" ? (
                              <span style={{ fontSize: "14px", color: "#666" }}>
                                {feature.plans[plan.name]}
                              </span>
                            ) : feature.plans[plan.name] === true ? (
                              <i className="fas fa-check" style={{ fontSize: "14px", color: "#613171" }} />
                            ) : (
                              <i className="fas fa-minus" style={{ fontSize: "14px", color: "#ccc" }} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr>
                  <th style={{ paddingTop: "24px", fontSize: "14px", fontWeight: 400, color: "#888" }} />
                  {plans.map((plan) => (
                    <td key={plan.name} style={{ paddingTop: "24px", paddingLeft: "24px" }}>
                      <Link
                        href={plan.buttonLink}
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: plan.isStarter ? "#1a1a2e" : "#613171",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {plan.buttonText}
                        <i className="far fa-arrow-right" />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
