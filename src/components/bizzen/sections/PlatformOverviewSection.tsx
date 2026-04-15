"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const MODULES = [
  {
    key: "feedback360",
    icon: "fa-people-arrows",
    color: "#8b5cf6",
    href: "/modulos/feedback-360",
    features: ["f1", "f2", "f3", "f4"],
    screenshot: "/images/screenshots/360-cycle-detail.png",
  },
  {
    key: "climate",
    icon: "fa-heart-pulse",
    color: "#ec4899",
    href: "/modulos/encuestas-clima",
    features: ["f1", "f2", "f3", "f4"],
    screenshot: "/images/screenshots/climate-results.png",
  },
  {
    key: "people",
    icon: "fa-users-gear",
    color: "#22c55e",
    href: "/modulos/gestion-personas",
    features: ["f1", "f2", "f3", "f4"],
    screenshot: "/images/screenshots/people-directory.png",
  },
  {
    key: "org",
    icon: "fa-sitemap",
    color: "#f59e0b",
    href: "/modulos/estructura-organizacional",
    features: ["f1", "f2", "f3", "f4"],
    screenshot: "/images/screenshots/org-departments.png",
  },
] as const;

export function PlatformOverviewSection() {
  const t = useTranslations("plataforma.modules");

  return (
    <section
      className="platform-overview"
      style={{ padding: "100px 0", backgroundColor: "#fff" }}
    >
      <div className="container">
        {MODULES.map((mod, index) => {
          const visualLeft = index % 2 === 0;
          return (
            <div
              key={mod.key}
              className="row align-items-center"
              style={{ marginBottom: "80px" }}
            >
              {/* Visual column */}
              <div
                className={`col-lg-6 order-lg-${visualLeft ? 1 : 2}`}
              >
                <div
                  style={{
                    backgroundColor: "#f8f9fc",
                    borderRadius: "20px",
                    padding: "16px 16px 0",
                    border: `1px solid ${mod.color}15`,
                    overflow: "hidden",
                  }}
                >
                  {/* Browser chrome */}
                  <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#febc2e" }} />
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#28c840" }} />
                  </div>
                  <img
                    src={mod.screenshot}
                    alt={mod.key}
                    style={{
                      width: "100%",
                      borderRadius: "8px 8px 0 0",
                      display: "block",
                    }}
                  />
                </div>
              </div>

              {/* Content column */}
              <div
                className={`col-lg-6 order-lg-${visualLeft ? 2 : 1}`}
              >
                <div style={{ padding: "24px 40px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      backgroundColor: `${mod.color}15`,
                      color: mod.color,
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "16px",
                    }}
                  >
                    {t("badge")}
                  </span>
                  <h3
                    style={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#1a1a2e",
                      marginBottom: "16px",
                    }}
                  >
                    {t(`${mod.key}.title`)}
                  </h3>
                  <p
                    style={{
                      color: "#666",
                      fontSize: "16px",
                      lineHeight: 1.7,
                      marginBottom: "24px",
                    }}
                  >
                    {t(`${mod.key}.description`)}
                  </p>

                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 28px",
                    }}
                  >
                    {mod.features.map((feat) => (
                      <li
                        key={feat}
                        style={{
                          padding: "6px 0",
                          fontSize: "15px",
                          color: "#444",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        <i
                          className="fas fa-check"
                          style={{
                            color: mod.color,
                            fontSize: "12px",
                            marginTop: "5px",
                            flexShrink: 0,
                          }}
                        />
                        {t(`${mod.key}.features.${feat}`)}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={mod.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      color: mod.color,
                      fontSize: "15px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {t("cta_detail")}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
