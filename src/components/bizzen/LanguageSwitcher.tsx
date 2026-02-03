"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: "es" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="lang-switcher d-none d-md-flex" style={{ gap: "0.5rem", marginRight: "1rem" }}>
      <button
        onClick={() => switchLocale("es")}
        className={`lang-btn ${locale === "es" ? "active" : ""}`}
        style={{
          background: "none",
          border: "none",
          color: locale === "es" ? "var(--primary-color)" : "rgba(255, 255, 255, 0.8)",
          fontWeight: locale === "es" ? "700" : "400",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ES
      </button>
      <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>|</span>
      <button
        onClick={() => switchLocale("en")}
        className={`lang-btn ${locale === "en" ? "active" : ""}`}
        style={{
          background: "none",
          border: "none",
          color: locale === "en" ? "var(--primary-color)" : "rgba(255, 255, 255, 0.8)",
          fontWeight: locale === "en" ? "700" : "400",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        EN
      </button>
    </div>
  );
}
