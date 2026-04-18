"use client";

import { useTranslations } from "next-intl";

const CAPABILITIES = [
  { key: "security", icon: "fa-shield-halved", color: "#6366f1" },
  { key: "multitenant", icon: "fa-building", color: "#8b5cf6" },
  { key: "roles", icon: "fa-key", color: "#ec4899" },
  { key: "export", icon: "fa-file-export", color: "#22c55e" },
] as const;

export function TransversalCapabilitiesSection() {
  const t = useTranslations("plataforma.capabilities");

  return (
    <section
      className="platform-capabilities"
      style={{ padding: "100px 0", backgroundColor: "#f8f9fc" }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-7 col-lg-9">
            <div className="section-title text-center mb-60">
              <span
                className="sub-title"
              >
                {t("subtitle")}
              </span>
              <h2
                className="text-anm"
                style={{ marginBottom: "16px" }}
              >
                {t("title")}
              </h2>
            </div>
          </div>
        </div>

        <div className="row">
          {CAPABILITIES.map((cap, index) => (
            <div
              key={cap.key}
              className="col-lg-3 col-md-6"
            >
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  padding: "32px 24px",
                  marginBottom: "24px",
                  border: "1px solid #eee",
                  textAlign: "center",
                  height: "calc(100% - 24px)",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    backgroundColor: `${cap.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: "22px",
                    color: cap.color,
                  }}
                >
                  <i className={`fas ${cap.icon}`} />
                </div>
                <h5
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "#1a1a2e",
                    marginBottom: "10px",
                  }}
                >
                  {t(`${cap.key}.title`)}
                </h5>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {t(`${cap.key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
