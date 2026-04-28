"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const HERO_IMAGES = [
  "/images/hero/hero-event-1.jpg",
  "/images/team/team-workshop.jpg",
  "/images/team/gallery-3.jpg",
];

const INTERVAL_MS = 6000;

const heroSlides = [
  {
    stat: "200+",
    statKey: "clients",
    description:
      "Empresas de todos los tamaños confían en nosotros para transformar su cultura organizacional y potenciar su talento.",
  },
  {
    stat: "100+",
    statKey: "projects",
    description:
      "Horas de conferencias y formación en liderazgo, cultura y desarrollo organizacional impartidas a equipos en Colombia y Latinoamérica.",
  },
  {
    stat: "15+",
    statKey: "years",
    description:
      "Años de experiencia acompañando a organizaciones en Colombia y Latinoamérica en su camino hacia la excelencia.",
  },
];

export function HeroSection() {
  const t = useTranslations("home.hero");
  const tStats = useTranslations("home.stats");
  const [bgIndex, setBgIndex] = useState(0);
  const [statIndex, setStatIndex] = useState(0);

  const advanceBg = useCallback(() => {
    setBgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
  }, []);

  const advanceStat = useCallback(() => {
    setStatIndex((prev) => (prev + 1) % heroSlides.length);
  }, []);

  useEffect(() => {
    const bgTimer = setInterval(advanceBg, INTERVAL_MS);
    const statTimer = setInterval(advanceStat, 4000);
    return () => {
      clearInterval(bgTimer);
      clearInterval(statTimer);
    };
  }, [advanceBg, advanceStat]);

  const currentStat = heroSlides[statIndex];

  return (
    <section className="bizzen-hero">
      <div
        className="bizzen-hero_one bg_cover"
        style={{
          backgroundColor: "var(--header-dark-color)",
          backgroundImage: "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="hero-bg-shape" />
        <div className="container-fluid" style={{ position: "relative", zIndex: 1 }}>
          <div className="row">
            <div className="col-lg-8">
              <div className="hero-content">
                <span
                  className="sub-title"
                  data-aos="fade-down"
                  data-aos-duration="1000"
                >
                  {t("subtitle")}
                </span>
                <h1 className="text-anm">{t("title")}</h1>
                <div
                  className="hero-button"
                  data-aos="fade-up"
                  data-aos-duration="1400"
                >
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta_secondary")}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div
                className="text-box mb-5 mb-xl-0"
                data-aos="fade-up"
                data-aos-duration="1000"
              >
                {/* Stat carousel with crossfade */}
                <div style={{ position: "relative", minHeight: "280px" }}>
                  {heroSlides.map((slide, i) => (
                    <div
                      key={i}
                      style={{
                        position: i === 0 ? "relative" : "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        opacity: i === statIndex ? 1 : 0,
                        transition: "opacity 0.6s ease-in-out",
                        pointerEvents: i === statIndex ? "auto" : "none",
                      }}
                    >
                      <h4>
                        {slide.stat} <span>{tStats(slide.statKey)}</span>
                      </h4>
                      <p>{slide.description}</p>
                    </div>
                  ))}
                </div>

                {/* Dot indicators for stats */}
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  {heroSlides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStatIndex(i)}
                      style={{
                        width: i === statIndex ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        border: "none",
                        background:
                          i === statIndex
                            ? "var(--theme-color)"
                            : "rgba(255,255,255,0.3)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        padding: 0,
                      }}
                      aria-label={`Stat ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-12">
              {/* Hero Image with carousel transition */}
              <div
                className="hero-image text-center"
                data-aos="fade-up"
                data-aos-duration="1200"
                style={{ position: "relative", overflow: "hidden" }}
              >
                {HERO_IMAGES.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt="hero image"
                    style={{
                      position: i === 0 ? "relative" : "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      opacity: i === bgIndex ? 1 : 0,
                      transition: "opacity 1.2s ease-in-out",
                    }}
                  />
                ))}
                <div className="hero-rating-box">
                  <h2>{currentStat.stat}</h2>
                  <div className="ratings">
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                    <i className="fas fa-star" />
                  </div>
                  <p>{tStats(currentStat.statKey)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background image indicators */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "8px",
            zIndex: 2,
          }}
        >
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              style={{
                width: i === bgIndex ? "32px" : "12px",
                height: "6px",
                borderRadius: "3px",
                border: "none",
                background:
                  i === bgIndex
                    ? "var(--theme-color)"
                    : "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "all 0.4s ease",
                padding: 0,
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
