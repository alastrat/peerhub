"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const SERVICES = [
  {
    slug: "/servicios/cultura",
    key: "cultura",
    icon: "fa-compass",
    color: "#8b5cf6",
    image: "/images/team/team-workshop.jpg",
  },
  {
    slug: "/servicios/seleccion-especializada",
    key: "seleccion",
    icon: "fa-user-tie",
    color: "#3b82f6",
    image: "/images/team/conference-1.jpg",
  },
  {
    slug: "/servicios/cambio",
    key: "cambio",
    icon: "fa-arrows-rotate",
    color: "#f59e0b",
    image: "/images/team/team-event.jpg",
  },
  {
    slug: "/servicios/comunicacion-interna",
    key: "comunicacion",
    icon: "fa-comments",
    color: "#22c55e",
    image: "/images/team/amcham-event.jpg",
  },
  {
    slug: "/diagnostico-clima",
    key: "clima",
    icon: "fa-heart-pulse",
    color: "#ec4899",
    image: "/images/team/iskya-speaking.jpg",
  },
] as const;

export function ServicesListSection() {
  const t = useTranslations("services");
  const tCommon = useTranslations("common");

  return (
    <section style={{ padding: "80px 0", backgroundColor: "#fff" }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-7 col-lg-9">
            <div className="section-title text-center" style={{ marginBottom: "48px" }}>
              <span className="sub-title">{t("list.subtitle")}</span>
              <h2 className="text-anm" style={{ marginBottom: "16px" }}>
                {t("list.title")}
              </h2>
              <p style={{ color: "#666", fontSize: "16px", lineHeight: 1.7 }}>
                {t("list.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="row">
          {SERVICES.map((svc) => (
            <div key={svc.slug} className="col-lg-4 col-md-6">
              <Link
                href={svc.slug}
                style={{
                  display: "block",
                  textDecoration: "none",
                  marginBottom: "28px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  backgroundColor: "#fff",
                  border: "1px solid #eee",
                  transition: "all 0.3s ease",
                  height: "calc(100% - 28px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 48px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    aspectRatio: "16 / 10",
                    width: "100%",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <img
                    src={svc.image}
                    alt={t(`${svc.key}.title`)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      display: "block",
                    }}
                  />
                </div>

                <div style={{ padding: "40px 24px 24px", position: "relative" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: svc.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "18px",
                      position: "absolute",
                      top: "-24px",
                      left: "24px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    <i className={`fas ${svc.icon}`} />
                  </div>
                  <h4
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#1a1a2e",
                      marginBottom: "10px",
                    }}
                  >
                    {t(`${svc.key}.title`)}
                  </h4>
                  <p
                    style={{
                      color: "#666",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      marginBottom: "16px",
                      minHeight: "64px",
                    }}
                  >
                    {t(`${svc.key}.short_description`)}
                  </p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: svc.color,
                      fontSize: "13px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {tCommon("learn_more")}
                    <i className="far fa-arrow-right" />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
