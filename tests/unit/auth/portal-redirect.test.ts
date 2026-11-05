import { describe, it, expect } from "vitest";
import { isPortalRedirect } from "@/lib/auth/portal-redirect";

describe("isPortalRedirect", () => {
  it("allows portal pages and climate reports", () => {
    expect(isPortalRedirect("/portal/climate-results/s1")).toBe(true);
    expect(isPortalRedirect("/climate-report/s1/leaders/e1")).toBe(true);
  });

  it("rejects anything else, including other origins", () => {
    expect(isPortalRedirect(null)).toBe(false);
    expect(isPortalRedirect("")).toBe(false);
    expect(isPortalRedirect("/surveys/climate/s1")).toBe(false);
    expect(isPortalRedirect("https://evil.example/portal/")).toBe(false);
    expect(isPortalRedirect("//evil.example/portal/")).toBe(false);
  });
});
