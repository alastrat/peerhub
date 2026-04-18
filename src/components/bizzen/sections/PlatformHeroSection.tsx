"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const CLIENT_LOGOS = [
  "/images/clients/client-1.png",
  "/images/clients/client-2.png",
  "/images/clients/client-3.png",
  "/images/clients/client-4.png",
  "/images/clients/fintra-logo.jpg",
];

export function PlatformHeroSection() {
  const t = useTranslations("home.hero");

  return (
    <section className="platform-hero">
      <div
        className="platform-hero__bg"
        style={{
          backgroundColor: "var(--header-dark-color)",
          backgroundImage: "var(--page-hero-overlay)",
          position: "relative",
          overflow: "hidden",
          paddingTop: "140px",
          paddingBottom: "80px",
        }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="platform-hero__content">
                <h1
                  className="anim-fade-up anim-delay-200"
                  style={{
                    color: "#fff",
                    fontSize: "clamp(32px, 4vw, 52px)",
                    fontWeight: 700,
                    lineHeight: 1.15,
                    marginBottom: "24px",
                  }}
                >
                  {t("title")}
                </h1>

                <p
                  className="anim-fade-up anim-delay-300"
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "18px",
                    lineHeight: 1.7,
                    marginBottom: "36px",
                    maxWidth: "520px",
                  }}
                >
                  {t("description")}
                </p>

                <div
                  className="platform-hero__ctas anim-fade-up anim-delay-400"
                  style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
                >
                  <Link
                    href="/contacto"
                    className="theme-btn style-one"
                    style={{ fontSize: "16px", padding: "14px 32px" }}
                  >
                    {t("cta_primary")}
                    <i className="far fa-arrow-right" style={{ marginLeft: "8px" }} />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="theme-btn style-two"
                    style={{
                      fontSize: "16px",
                      padding: "14px 32px",
                      backgroundColor: "transparent",
                      border: "2px solid rgba(255,255,255,0.3)",
                      color: "#fff",
                    }}
                  >
                    {t("cta_secondary")}
                    <i className="far fa-play" style={{ marginLeft: "8px" }} />
                  </a>
                </div>

                {/* Trusted by */}
                <div
                  style={{ marginTop: "48px" }}
                >
                  <p
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: "13px",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "16px",
                    }}
                  >
                    {t("trusted_by")}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {CLIENT_LOGOS.map((logo, i) => (
                      <img
                        key={i}
                        src={logo}
                        alt="client"
                        style={{
                          height: "28px",
                          objectFit: "contain",
                          filter: "brightness(0) invert(1)",
                          opacity: 0.5,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div
                className="platform-hero__visual"
                style={{
                  position: "relative",
                  marginTop: "40px",
                }}
              >
                {/* Real platform screenshot */}
                <div
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "16px 16px 0",
                    backdropFilter: "blur(20px)",
                    overflow: "hidden",
                  }}
                >
                  {/* Browser chrome */}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      marginBottom: "12px",
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#febc2e" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#28c840" }} />
                  </div>

                  <img
                    src="/images/screenshots/dashboard-overview.png"
                    alt="Kultiva Dashboard"
                    style={{
                      width: "100%",
                      borderRadius: "8px 8px 0 0",
                      display: "block",
                    }}
                  />
                </div>

                {/* Floating notification card */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-20px",
                    left: "-20px",
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "16px",
                    }}
                  >
                    <i className="fas fa-check" />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>360 Feedback Complete</div>
                    <div style={{ fontSize: "11px", color: "#888" }}>12 evaluations received</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
