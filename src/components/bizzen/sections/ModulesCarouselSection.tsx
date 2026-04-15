"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const MODULES = [
  { slug: "feedback-360", icon: "fa-people-arrows", color: "#8b5cf6", key: "feedback360" },
  { slug: "encuestas-clima", icon: "fa-cloud-sun", color: "#ec4899", key: "climate" },
  { slug: "gestion-personas", icon: "fa-users-gear", color: "#22c55e", key: "people" },
  { slug: "estructura-organizacional", icon: "fa-sitemap", color: "#f59e0b", key: "org" },
];

export function ModulesCarouselSection() {
  const t = useTranslations("home.modules_carousel");
  const [activeId, setActiveId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setActiveId(null);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    if (activeId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, handleClose]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }

    if (activeId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeId, handleClose]);

  const activeModule = MODULES.find((m) => m.key === activeId);

  return (
    <section
      style={{
        padding: "100px 0",
        backgroundColor: "#f8f7fa",
        position: "relative",
      }}
    >
      <div className="container">
        {/* Section header */}
        <div className="row justify-content-center">
          <div className="col-xl-7 col-lg-9">
            <div className="section-title text-center" style={{ marginBottom: "50px" }}>
              <span
                className="sub-title"
                style={{ color: "var(--accent-color)" }}
              >
                {t("subtitle")}
              </span>
              <h2 style={{ marginBottom: "16px" }}>{t("title")}</h2>
              <p
                style={{
                  color: "#666",
                  fontSize: "17px",
                  lineHeight: 1.7,
                  maxWidth: "560px",
                  margin: "0 auto",
                }}
              >
                {t("description")}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop grid / mobile scroll */}
        <div
          className="row d-none d-lg-flex"
          style={{ justifyContent: "center" }}
        >
          {MODULES.map((mod) => (
            <div key={mod.key} className="col-lg-3 col-md-6" style={{ marginBottom: "24px" }}>
              <ModuleCard
                mod={mod}
                t={t}
                onOpen={() => setActiveId(mod.key)}
              />
            </div>
          ))}
        </div>

        {/* Mobile horizontal scroll */}
        <div
          className="d-lg-none"
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "16px",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {MODULES.map((mod) => (
            <div
              key={mod.key}
              style={{
                flex: "0 0 260px",
                scrollSnapAlign: "start",
              }}
            >
              <ModuleCard
                mod={mod}
                t={t}
                onOpen={() => setActiveId(mod.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal overlay with shared-element transition */}
      <AnimatePresence>
        {activeId && activeModule && (
          <div
            ref={overlayRef}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(8px)",
              }}
            />
            <motion.div
              ref={modalRef}
              layoutId={`module-card-${activeId}`}
              style={{
                position: "relative",
                zIndex: 1051,
                backgroundColor: "#fff",
                borderRadius: "20px",
                padding: "40px",
                maxWidth: "560px",
                width: "90%",
                margin: "40px auto",
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.2)",
              }}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#f0f0f0",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  color: "#666",
                }}
                aria-label="Close"
              >
                <i className="fas fa-times" />
              </button>

              {/* Icon */}
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "18px",
                  backgroundColor: `${activeModule.color}26`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                <i
                  className={`fas ${activeModule.icon}`}
                  style={{ fontSize: "32px", color: activeModule.color }}
                />
              </div>

              {/* Title */}
              <motion.h3
                layoutId={`module-title-${activeId}`}
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: "12px",
                }}
              >
                {t(`${activeModule.key}.title`)}
              </motion.h3>

              {/* Summary */}
              <p
                style={{
                  fontSize: "16px",
                  color: "#555",
                  lineHeight: 1.7,
                  marginBottom: "28px",
                }}
              >
                {t(`${activeModule.key}.summary`)}
              </p>

              {/* Feature bullets */}
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 32px 0",
                }}
              >
                {["1", "2", "3", "4"].map((num) => (
                  <li
                    key={num}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginBottom: "14px",
                      fontSize: "15px",
                      color: "#444",
                      lineHeight: 1.6,
                    }}
                  >
                    <i
                      className="fas fa-check-circle"
                      style={{
                        color: activeModule.color,
                        fontSize: "16px",
                        marginTop: "3px",
                        flexShrink: 0,
                      }}
                    />
                    <span>{t(`${activeModule.key}.features.${num}`)}</span>
                  </li>
                ))}
              </ul>

              {/* CTA link */}
              <Link
                href={`/modulos/${activeModule.slug}`}
                className="theme-btn style-one"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "15px",
                  padding: "12px 28px",
                }}
              >
                {t("view_full")}
                <i className="far fa-arrow-right" />
              </Link>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Card sub-component ────────────────────────────────────────── */

interface ModuleCardProps {
  mod: (typeof MODULES)[number];
  t: ReturnType<typeof useTranslations>;
  onOpen: () => void;
}

function ModuleCard({ mod, t, onOpen }: ModuleCardProps) {
  return (
    <motion.div
      layoutId={`module-card-${mod.key}`}
      onClick={onOpen}
      style={{
        backgroundColor: "#fff",
        borderRadius: "16px",
        padding: "28px 24px",
        cursor: "pointer",
        border: "1px solid #eee",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}
      whileHover={{
        boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
        y: -4,
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          backgroundColor: `${mod.color}26`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <i
          className={`fas ${mod.icon}`}
          style={{ fontSize: "24px", color: mod.color }}
        />
      </div>

      {/* Title */}
      <motion.h4
        layoutId={`module-title-${mod.key}`}
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#1a1a2e",
          marginBottom: "10px",
        }}
      >
        {t(`${mod.key}.title`)}
      </motion.h4>

      {/* Summary */}
      <p
        style={{
          fontSize: "14px",
          color: "#777",
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
        }}
      >
        {t(`${mod.key}.summary`)}
      </p>

      {/* View detail indicator */}
      <div
        style={{
          marginTop: "18px",
          fontSize: "14px",
          fontWeight: 600,
          color: mod.color,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {t("view_detail")}
        <i className="far fa-arrow-right" style={{ fontSize: "12px" }} />
      </div>
    </motion.div>
  );
}
