import { describe, it, expect, vi, beforeEach } from "vitest";

let dashboardSession: { companyUser?: { locale?: string } } | null = null;
let portalLocale: "es" | "en" = "es";

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(async () => dashboardSession),
}));
vi.mock("@/lib/auth/portal-locale", () => ({
  getPortalLocale: vi.fn(async () => portalLocale),
}));

import { actionError, getActionLocale, unexpectedActionError } from "@/lib/auth/action-locale";

describe("server action language", () => {
  beforeEach(() => {
    dashboardSession = null;
    portalLocale = "es";
  });

  it("uses the dashboard session's company locale first", async () => {
    dashboardSession = { companyUser: { locale: "en" } };
    portalLocale = "es";
    expect(await getActionLocale()).toBe("en");
    expect(await actionError("survey_not_found")).toEqual({ success: false, error: "Survey not found" });
  });

  it("falls back to the portal employee's company", async () => {
    portalLocale = "en";
    expect(await getActionLocale()).toBe("en");
  });

  it("defaults to Spanish", async () => {
    expect(await actionError("survey_not_found")).toEqual({ success: false, error: "No encontramos la encuesta" });
  });

  it("names auth failures and only shows technical detail when asked", async () => {
    expect((await unexpectedActionError(new Error("Unauthorized"), "failed_close")).error).toBe(
      "No tienes permiso para hacer esto",
    );
    expect((await unexpectedActionError(new Error("timeout"), "failed_close")).error).toBe("No se pudo cerrar la encuesta");
    expect((await unexpectedActionError(new Error("timeout"), "failed_close", { withDetail: true })).error).toBe(
      "No se pudo cerrar la encuesta (timeout)",
    );
  });
});
