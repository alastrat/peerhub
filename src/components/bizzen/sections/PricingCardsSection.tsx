"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import React from "react";
import { plans, isVariablePrice } from "./pricing-data";

interface PricingCardsSectionProps {
  /** When embedded in homepage, show the section header (subtitle/title/description) */
  showHeader?: boolean;
  /** When embedded as standalone, render outer section with padding/background */
  withBackground?: boolean;
}

export function PricingCardsSection({
  showHeader = true,
  withBackground = true,
}: PricingCardsSectionProps = {}) {
  const t = useTranslations("home.pricing");
  const [billingFrequency, setBillingFrequency] = React.useState<"monthly" | "annually">("annually");

  const content = (
    <div style={{ maxWidth: "1140px", margin: "0 auto" }}>
      {showHeader && (
        <div style={{ textAlign: "center", marginBottom: "40px", maxWidth: "720px", margin: "0 auto 40px" }}>
          <span className="sub-title">{t("subtitle")}</span>
          <h2
            style={{
              marginTop: "8px",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              color: "#1a1a2e",
              lineHeight: 1.15,
              marginBottom: "16px",
            }}
          >
            {t("title")}
          </h2>
          <p style={{ fontSize: "16px", color: "#666", lineHeight: 1.7 }}>
            Precios claros por usuario, sin costos escondidos ni sorpresas.
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "40px" }}>
        <span
          style={{
            fontSize: "14px",
            fontWeight: billingFrequency === "monthly" ? 600 : 400,
            color: billingFrequency === "monthly" ? "#1a1a2e" : "#888",
            cursor: "pointer",
          }}
          onClick={() => setBillingFrequency("monthly")}
        >
          Mensual
        </span>
        <button
          onClick={() => setBillingFrequency(billingFrequency === "monthly" ? "annually" : "monthly")}
          style={{
            width: "48px",
            height: "26px",
            borderRadius: "13px",
            backgroundColor: billingFrequency === "annually" ? "#613171" : "#ccc",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "background-color 0.2s",
          }}
          aria-label="Toggle billing frequency"
        >
          <span
            style={{
              position: "absolute",
              top: "3px",
              left: billingFrequency === "annually" ? "24px" : "3px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "#fff",
              transition: "left 0.2s",
            }}
          />
        </button>
        <span
          style={{
            fontSize: "14px",
            fontWeight: billingFrequency === "annually" ? 600 : 400,
            color: billingFrequency === "annually" ? "#1a1a2e" : "#888",
            cursor: "pointer",
          }}
          onClick={() => setBillingFrequency("annually")}
        >
          Anual (-20%)
        </span>
      </div>

      {/* Plan cards */}
      <div className="row">
        {plans.map((plan) => (
          <div key={plan.name} className="col-lg-4" style={{ marginBottom: "24px" }}>
            <div
              style={{
                padding: "24px",
                borderRadius: "16px",
                transition: "all 0.3s ease",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              {/* Recommended badge */}
              {plan.isRecommended ? (
                <div style={{ display: "flex", height: "16px", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ position: "relative", width: "100%" }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
                      <div style={{ width: "100%", borderTop: "1px solid #613171" }} />
                    </div>
                    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                      <span
                        style={{
                          backgroundColor: withBackground ? "#fff" : "#f8f9fc",
                          padding: "0 12px",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#613171",
                        }}
                      >
                        {t("popular")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ height: "16px", marginBottom: "16px" }}>
                  <div style={{ height: "1px", width: "100%", backgroundColor: "#eee" }} />
                </div>
              )}

              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e", marginTop: "16px" }}>
                {plan.name}
              </h3>

              {/* Price */}
              <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "48px",
                    fontWeight: 600,
                    color: "#1a1a2e",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {isVariablePrice(plan.price)
                    ? billingFrequency === "monthly"
                      ? plan.price.monthly
                      : plan.price.annually
                    : plan.price}
                </span>
                {plan.price !== "Custom" && (
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    USD<br />usuario / mes
                  </div>
                )}
              </div>

              <p style={{ marginTop: "20px", fontSize: "14px", color: "#666", lineHeight: 1.6 }}>
                {plan.description}
              </p>

              <div style={{ marginTop: "24px" }}>
                <Link
                  href={plan.buttonLink}
                  className={plan.isRecommended ? "theme-btn style-one" : ""}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 24px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    textDecoration: "none",
                    ...(plan.isRecommended
                      ? {}
                      : {
                          backgroundColor: "transparent",
                          border: "1px solid #ddd",
                          color: "#1a1a2e",
                        }),
                  }}
                >
                  {plan.buttonText}
                  <i className="far fa-arrow-right" style={{ marginLeft: "8px" }} />
                </Link>
              </div>

              {/* Capacity */}
              <ul style={{ listStyle: "none", padding: 0, marginTop: "28px" }}>
                {plan.capacity.map((item, i) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 0",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    <i
                      className={`fas ${i === 0 ? "fa-user" : "fa-building"}`}
                      style={{ fontSize: "12px", color: "#999", width: "16px" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, marginTop: "16px", flex: 1 }}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "6px 0",
                      fontSize: "14px",
                      color: "#555",
                    }}
                  >
                    <i
                      className="fas fa-check"
                      style={{ fontSize: "12px", color: "#613171", marginTop: "3px", flexShrink: 0 }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!withBackground) return content;

  return (
    <section style={{ padding: "80px 0", backgroundColor: "#fff" }}>
      <div className="container">{content}</div>
    </section>
  );
}
