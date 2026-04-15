"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface ModuleDetailSectionProps {
  /** Translation namespace, e.g. "modulos.feedback360" */
  namespace: string;
  /** Accent color for the module */
  accentColor: string;
  /** FontAwesome icon class without "fas " prefix, e.g. "fa-people-arrows" */
  icon: string;
  /** Path to a real screenshot image, e.g. "/images/screenshots/360-cycle-detail.png" */
  screenshot?: string;
  /** 6 capability keys to display */
  capabilityKeys: readonly string[];
  /** 5 process step keys */
  stepKeys: readonly string[];
  /** 5 FAQ keys */
  faqKeys: readonly string[];
  /** Cross-link slugs to other modules */
  crossLinks: { slug: string; key: string }[];
}

const CAPABILITY_ICONS = [
  "fa-bullseye",
  "fa-sliders",
  "fa-shield-halved",
  "fa-user-group",
  "fa-eye",
  "fa-file-lines",
];

export function ModuleDetailSection({
  namespace,
  accentColor,
  icon,
  screenshot,
  capabilityKeys,
  stepKeys,
  faqKeys,
  crossLinks,
}: ModuleDetailSectionProps) {
  const t = useTranslations(namespace);

  return (
    <>
      {/* Hero */}
      <section
        className="module-hero"
        style={{
          padding: "100px 0 80px",
          backgroundColor: "var(--header-dark-color)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            backgroundColor: `${accentColor}15`,
            pointerEvents: "none",
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="row align-items-center">
            <div className="col-lg-7">
              <span
                style={{
                  display: "inline-block",
                  padding: "5px 14px",
                  borderRadius: "16px",
                  backgroundColor: `${accentColor}25`,
                  color: accentColor,
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "20px",
                }}
              >
                {t("badge")}
              </span>
              <h1
                style={{
                  color: "#fff",
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginBottom: "20px",
                }}
              >
                {t("hero.title")}
              </h1>
              <p
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "17px",
                  lineHeight: 1.7,
                  marginBottom: "32px",
                  maxWidth: "560px",
                }}
              >
                {t("hero.description")}
              </p>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <Link
                  href="/demo"
                  className="theme-btn style-one"
                  style={{ padding: "14px 28px" }}
                >
                  {t("hero.cta_primary")}
                  <i className="far fa-arrow-right" style={{ marginLeft: "8px" }} />
                </Link>
                <a
                  href="#capabilities"
                  className="theme-btn style-two"
                  style={{
                    padding: "14px 28px",
                    backgroundColor: "transparent",
                    border: "2px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                  }}
                >
                  {t("hero.cta_secondary")}
                </a>
              </div>
            </div>
            <div className="col-lg-5">
              <div
                style={{
                  marginTop: "40px",
                }}
              >
                {screenshot ? (
                  <div
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "12px 12px 0",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#febc2e" }} />
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#28c840" }} />
                    </div>
                    <img
                      src={screenshot}
                      alt={namespace}
                      style={{
                        width: "100%",
                        borderRadius: "8px 8px 0 0",
                        display: "block",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "200px",
                        height: "200px",
                        borderRadius: "32px",
                        backgroundColor: `${accentColor}20`,
                        border: `2px solid ${accentColor}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <i className={`fas ${icon}`} style={{ fontSize: "80px", color: accentColor }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section style={{ padding: "80px 0", backgroundColor: "#fff" }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <h2
                className="text-anm"
                style={{ marginBottom: "20px" }}
              >
                {t("problem.title")}
              </h2>
              <p
                style={{ color: "#666", fontSize: "17px", lineHeight: 1.7 }}
              >
                {t("problem.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        style={{ padding: "100px 0", backgroundColor: "#f8f9fc" }}
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-7 col-lg-9">
              <div className="section-title text-center mb-60">
                <h2 className="text-anm">
                  {t("capabilities.title")}
                </h2>
              </div>
            </div>
          </div>
          <div className="row">
            {capabilityKeys.map((key, i) => (
              <div
                key={key}
                className="col-xl-4 col-md-6"
              >
                <div
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    padding: "28px",
                    marginBottom: "24px",
                    border: "1px solid #eee",
                    height: "calc(100% - 24px)",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: `${accentColor}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      fontSize: "18px",
                      color: accentColor,
                    }}
                  >
                    <i className={`fas ${CAPABILITY_ICONS[i % CAPABILITY_ICONS.length]}`} />
                  </div>
                  <h5
                    style={{
                      fontSize: "17px",
                      fontWeight: 600,
                      color: "#1a1a2e",
                      marginBottom: "10px",
                    }}
                  >
                    {t(`capabilities.${key}.title`)}
                  </h5>
                  <p style={{ color: "#666", fontSize: "14px", lineHeight: 1.65, margin: 0 }}>
                    {t(`capabilities.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section style={{ padding: "100px 0", backgroundColor: "#fff" }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-7 col-lg-9">
              <div className="section-title text-center mb-60">
                <h2 className="text-anm">
                  {t("process.title")}
                </h2>
              </div>
            </div>
          </div>
          <div className="row justify-content-center">
            {stepKeys.map((step, i) => (
              <div
                key={step}
                className="col-lg col-md-6"
              >
                <div style={{ textAlign: "center", padding: "20px 12px", position: "relative" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      backgroundColor: accentColor,
                      color: "#fff",
                      fontSize: "20px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    {i + 1}
                  </div>
                  <h6
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#1a1a2e",
                      marginBottom: "8px",
                    }}
                  >
                    {t(`process.${step}.title`)}
                  </h6>
                  <p style={{ color: "#666", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                    {t(`process.${step}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "80px 0", backgroundColor: "#f8f9fc" }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="section-title text-center mb-50">
                <h2 className="text-anm">
                  {t("faq.title")}
                </h2>
              </div>
              <div className="accordion" id={`faq-${namespace}`}>
                {faqKeys.map((q, i) => (
                  <div
                    key={q}
                    className="accordion-item"
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      marginBottom: "12px",
                      border: "1px solid #eee",
                      overflow: "hidden",
                    }}
                  >
                    <h2 className="accordion-header" id={`heading-${namespace}-${q}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse-${namespace}-${q}`}
                        aria-expanded="false"
                        aria-controls={`collapse-${namespace}-${q}`}
                        style={{
                          padding: "16px 20px",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#1a1a2e",
                          backgroundColor: "#fff",
                          border: "none",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        {t(`faq.${q}.q`)}
                      </button>
                    </h2>
                    <div
                      id={`collapse-${namespace}-${q}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading-${namespace}-${q}`}
                      data-bs-parent={`#faq-${namespace}`}
                    >
                      <div
                        className="accordion-body"
                        style={{
                          padding: "0 20px 16px",
                          color: "#555",
                          fontSize: "14px",
                          lineHeight: 1.65,
                        }}
                      >
                        {t(`faq.${q}.a`)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA + Cross-links */}
      <section
        style={{
          padding: "80px 0",
          backgroundColor: "var(--btn-primary-bg)",
          textAlign: "center",
        }}
      >
        <div className="container">
          <h2
            style={{ color: "#fff", marginBottom: "16px" }}
          >
            {t("cta.title")}
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "16px",
              marginBottom: "32px",
              maxWidth: "520px",
              margin: "0 auto 32px",
            }}
          >
            {t("cta.description")}
          </p>
          <Link
            href="/demo"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 32px",
              backgroundColor: "#fff",
              color: "var(--btn-primary-bg)",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t("cta.button")}
            <i className="far fa-arrow-right" />
          </Link>

          <div
            style={{ marginTop: "40px", display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}
          >
            {crossLinks.map(({ slug, key }) => (
              <Link
                key={slug}
                href={slug}
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "14px",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.3)",
                  paddingBottom: "2px",
                }}
              >
                → {t(`crosslinks.${key}`)}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
