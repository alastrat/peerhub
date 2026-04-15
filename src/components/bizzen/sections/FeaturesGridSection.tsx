"use client";

import { useOutsideClick } from "@/hooks/useOutsideClick";
import { cn } from "@/lib/utils/cn";
import { AnimatePresence, motion } from "motion/react";
import Image, { type ImageProps } from "next/image";
import type { JSX } from "react";
import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Carousel context + primitives (ported from rphants CardCarousel)
// ---------------------------------------------------------------------------

const CarouselContext = createContext<{
  onCardClose: (index: number) => void;
  currentIndex: number;
}>({
  onCardClose: () => {},
  currentIndex: 0,
});

function Carousel({ items, initialScroll = 0 }: { items: JSX.Element[]; initialScroll?: number }) {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

  const handleCardClose = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? 230 : 384;
      const gap = isMobile() ? 4 : 8;
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({ left: scrollPosition, behavior: "smooth" });
      setCurrentIndex(index);
    }
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full" style={{ position: "relative", width: "100%" }}>
        <div
          ref={carouselRef}
          onScroll={checkScrollability}
          style={{
            display: "flex",
            width: "100%",
            overflowX: "auto",
            overscrollBehaviorX: "auto",
            paddingTop: "40px",
            paddingBottom: "40px",
            scrollBehavior: "smooth",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-start",
              gap: "16px",
              paddingLeft: "16px",
              maxWidth: "1200px",
              margin: "0 auto",
            }}
          >
            {items.map((item, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, delay: 0.2 * index, ease: "easeOut" },
                }}
                key={"card" + index}
                style={{ borderRadius: "24px" }}
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginRight: "40px" }}>
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            style={{
              position: "relative",
              zIndex: 40,
              height: "40px",
              width: "40px",
              borderRadius: "50%",
              backgroundColor: "#f3f4f6",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canScrollLeft ? "pointer" : "default",
              opacity: canScrollLeft ? 1 : 0.5,
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: "14px", color: "#666" }} />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            style={{
              position: "relative",
              zIndex: 40,
              height: "40px",
              width: "40px",
              borderRadius: "50%",
              backgroundColor: "#f3f4f6",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canScrollRight ? "pointer" : "default",
              opacity: canScrollRight ? 1 : 0.5,
            }}
          >
            <i className="fas fa-arrow-right" style={{ fontSize: "14px", color: "#666" }} />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

type CardData = {
  src: string;
  title: string;
  category: string;
  content: React.ReactNode;
};

function FeatureCard({ card, index }: { card: CardData; index: number }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { onCardClose } = useContext(CarouselContext);

  useOutsideClick(containerRef, () => handleClose());

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    document.body.style.overflow = open ? "hidden" : "auto";
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div style={{ position: "fixed", inset: 0, height: "100vh", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                backgroundColor: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(12px)",
                height: "100%",
                width: "100%",
                position: "fixed",
                inset: 0,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              ref={containerRef}
              style={{
                maxWidth: "960px",
                width: "90%",
                margin: "40px auto",
                backgroundColor: "#fff",
                borderRadius: "24px",
                padding: "32px",
                position: "relative",
                zIndex: 60,
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  position: "sticky",
                  top: "16px",
                  float: "right",
                  height: "32px",
                  width: "32px",
                  backgroundColor: "#1a1a2e",
                  borderRadius: "50%",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: "14px",
                  zIndex: 10,
                }}
              >
                <i className="fas fa-times" />
              </button>
              <p style={{ fontSize: "15px", fontWeight: 500, color: "#1a1a2e" }}>
                {card.category}
              </p>
              <p style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 600, color: "#333", marginTop: "16px" }}>
                {card.title}
              </p>
              <div style={{ paddingTop: "40px" }}>{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={handleOpen}
        style={{
          borderRadius: "24px",
          backgroundColor: "#f3f4f6",
          height: "320px",
          width: "224px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          position: "relative",
          zIndex: 10,
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        className="feature-carousel-card"
      >
        <div
          style={{
            position: "absolute",
            height: "100%",
            top: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent, transparent)",
            zIndex: 30,
            pointerEvents: "none",
            borderRadius: "24px",
          }}
        />
        <div style={{ position: "relative", zIndex: 40, padding: "24px" }}>
          <p style={{ color: "#fff", fontSize: "14px", fontWeight: 500, textAlign: "left" }}>
            {card.category}
          </p>
          <p style={{ color: "#fff", fontSize: "20px", fontWeight: 600, maxWidth: "200px", textAlign: "left", marginTop: "8px", textWrap: "balance" }}>
            {card.title}
          </p>
        </div>
        <BlurImage
          src={card.src}
          alt={card.title}
          fill
          className="object-cover"
          style={{ position: "absolute", zIndex: 10, inset: 0, objectFit: "cover", borderRadius: "24px" }}
        />
      </motion.button>
    </>
  );
}

function BlurImage({ className, alt, ...rest }: ImageProps) {
  const [isLoading, setLoading] = useState(true);
  return (
    <Image
      className={cn(
        "transition duration-300",
        isLoading ? "blur-sm" : "blur-0",
        className
      )}
      onLoad={() => setLoading(false)}
      loading="lazy"
      decoding="async"
      alt={alt || "Feature image"}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Expanded content shown when card is clicked
// ---------------------------------------------------------------------------

function FeatureContent({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        backgroundColor: "#f5f5f7",
        padding: "32px",
        borderRadius: "24px",
        marginBottom: "16px",
      }}
    >
      <p style={{ color: "#555", fontSize: "18px", maxWidth: "720px", margin: "0 auto", lineHeight: 1.7 }}>
        <span style={{ fontWeight: 700, color: "#333" }}>{title}</span>{" "}
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data — uses same Unsplash images from rphants
// ---------------------------------------------------------------------------

const FEATURE_DATA: CardData[] = [
  {
    category: "Feedback 360°",
    title: "Ciclos de evaluación multi-evaluador",
    src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop",
    content: (
      <FeatureContent
        title="Ciclos completos de Feedback 360°."
        description="Configura evaluaciones con múltiples perspectivas: autoevaluación, jefe, pares, reportes directos y evaluadores externos. Define competencias, umbrales de anonimato y controla cuándo se libera cada reporte individual."
      />
    ),
  },
  {
    category: "Encuestas de Clima",
    title: "Mide el pulso de tu organización",
    src: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=2070&auto=format&fit=crop",
    content: (
      <FeatureContent
        title="Tres tipos de encuesta para diferentes momentos."
        description="Clima completo (anual), Pulso rápido (mensual) y eNPS (lealtad). Plantillas listas, dimensiones personalizables y segmentación flexible por sede, departamento, equipo o selección manual. Reportes con heatmaps por dimensión."
      />
    ),
  },
  {
    category: "Gestión de Personas",
    title: "Tu directorio, sin hojas de cálculo",
    src: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2071&auto=format&fit=crop",
    content: (
      <FeatureContent
        title="Centraliza la información de tu equipo."
        description="Perfiles completos, carga masiva por CSV, jerarquía de jefaturas y datos siempre actualizados. Asigna roles (Admin, Manager, Empleado) para controlar accesos. Desactiva colaboradores sin perder su historial."
      />
    ),
  },
  {
    category: "Estructura Organizacional",
    title: "Modela tu organización como realmente es",
    src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop",
    content: (
      <FeatureContent
        title="Sedes, departamentos y equipos transversales."
        description="Define Hubs (sedes geográficas), departamentos por sede y equipos que cruzan áreas. Esta estructura alimenta la segmentación de encuestas y el alcance de los ciclos de feedback con precisión."
      />
    ),
  },
  {
    category: "Reportes y Analítica",
    title: "Decisiones con evidencia, no con intuición",
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
    content: (
      <FeatureContent
        title="Dashboards en tiempo real y exportación CSV."
        description="Reportes individuales de feedback 360°, heatmaps de clima por dimensión, tendencias eNPS entre períodos y desglose por departamento, equipo y sede. Control granular sobre la liberación de cada reporte."
      />
    ),
  },
  {
    category: "Roles y Permisos",
    title: "Control total sobre quién ve qué",
    src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop",
    content: (
      <FeatureContent
        title="Roles personalizables con permisos granulares."
        description="Roles del sistema (Admin, Manager, Empleado) más roles personalizados por empresa. Multi-tenant con aislamiento completo de datos. Cada empresa opera en su propio espacio sin riesgo de mezcla."
      />
    ),
  },
];

// ---------------------------------------------------------------------------
// Exported section
// ---------------------------------------------------------------------------

export function FeaturesGridSection() {
  const t = useTranslations("home.features");

  const cards = FEATURE_DATA.map((card, index) => (
    <FeatureCard key={card.src} card={card} index={index} />
  ));

  return (
    <section
      className="platform-features"
      style={{ padding: "80px 0", backgroundColor: "#f8f9fc" }}
    >
      <div className="container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 40px)",
              fontWeight: 700,
              color: "#1a1a2e",
              textAlign: "center",
              maxWidth: "900px",
              marginBottom: "0",
            }}
          >
            {t("title")}
          </h2>
          <p
            style={{
              marginTop: "24px",
              maxWidth: "720px",
              fontSize: "17px",
              lineHeight: 1.7,
              color: "#666",
              textAlign: "center",
              paddingLeft: "16px",
            }}
          >
            {t("description")}
          </p>
          <Carousel items={cards} />
        </div>
      </div>
    </section>
  );
}
