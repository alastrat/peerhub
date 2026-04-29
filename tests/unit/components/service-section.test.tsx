import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const FALLBACKS: Record<string, Record<string, string>> = {
  "home.services": {
    subtitle: "Nuestros Servicios (fallback)",
    title: "Soluciones integrales (fallback)",
    description: "Ofrecemos servicios (fallback).",
  },
  common: {
    learn_more: "Conoce más",
  },
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    FALLBACKS[namespace]?.[key] ?? `${namespace}.${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.PropsWithChildren<{ href: string; className?: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ServiceSection } from "@/components/bizzen/sections/ServiceSection";

afterEach(() => {
  cleanup();
});

describe("ServiceSection — Sanity copy overrides", () => {
  it("falls back to translation keys when no overrides are passed", () => {
    render(<ServiceSection services={[]} />);

    expect(screen.getByText("Nuestros Servicios (fallback)")).toBeTruthy();
    expect(
      screen.getByText("Soluciones integrales (fallback)")
    ).toBeTruthy();
    expect(
      screen.getByText(/Ofrecemos servicios \(fallback\)\./)
    ).toBeTruthy();
  });

  it("renders Sanity overrides when provided", () => {
    render(
      <ServiceSection
        services={[]}
        subtitle="EYEBROW DESDE SANITY"
        title="Título desde Sanity"
        description="Descripción desde Sanity."
      />
    );

    expect(screen.getByText("EYEBROW DESDE SANITY")).toBeTruthy();
    expect(screen.getByText("Título desde Sanity")).toBeTruthy();
    expect(screen.getByText(/Descripción desde Sanity\./)).toBeTruthy();

    // Fallback values must NOT also be rendered
    expect(
      screen.queryByText("Nuestros Servicios (fallback)")
    ).toBeNull();
  });

  it("falls back per-field when only some overrides are provided", () => {
    render(<ServiceSection services={[]} title="Solo el título cambia" />);

    // Title: override
    expect(screen.getByText("Solo el título cambia")).toBeTruthy();
    // Subtitle and description: fallback
    expect(screen.getByText("Nuestros Servicios (fallback)")).toBeTruthy();
    expect(
      screen.getByText(/Ofrecemos servicios \(fallback\)\./)
    ).toBeTruthy();
  });
});
