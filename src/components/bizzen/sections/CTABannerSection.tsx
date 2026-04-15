"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CTABannerSection() {
  const t = useTranslations("home.cta_banner");

  return (
    <section
      className="platform-cta-banner"
      style={{
        padding: "80px 0",
        backgroundColor: "var(--btn-primary-bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: "-80px",
          right: "-80px",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.05)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-60px",
          left: "-60px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.05)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-xl-8 col-lg-10 text-center">
            <h2
              className="anim-fade-up"
              style={{
                color: "#fff",
                fontSize: "clamp(28px, 3.5vw, 42px)",
                fontWeight: 700,
                marginBottom: "16px",
                lineHeight: 1.2,
              }}
            >
              {t("title")}
            </h2>
            <p
              className="anim-fade-up anim-delay-100"
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "17px",
                lineHeight: 1.7,
                marginBottom: "36px",
                maxWidth: "560px",
                margin: "0 auto 36px",
              }}
            >
              {t("description")}
            </p>

            <div
              className="anim-fade-up anim-delay-200"
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/contacto"
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
                  transition: "all 0.3s ease",
                }}
              >
                {t("cta_primary")}
                <i className="far fa-arrow-right" />
              </Link>
              <a
                href="#how-it-works"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "14px 32px",
                  backgroundColor: "transparent",
                  color: "#fff",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                }}
              >
                {t("cta_secondary")}
                <i className="far fa-play" />
              </a>
            </div>

            {/* G2 / Trust badge */}
            <div
              style={{
                marginTop: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "2px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className="fas fa-star"
                    style={{ color: "#fbbf24", fontSize: "14px" }}
                  />
                ))}
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                }}
              >
                4.8/5 — 200+ reviews
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
