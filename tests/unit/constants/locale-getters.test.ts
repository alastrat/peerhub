import { describe, it, expect } from "vitest";
import {
  getRoleLabel,
  getGlobalRoleLabel,
  getReviewerTypeLabel,
  getReviewerTypeDescription,
  ROLE_HIERARCHY,
  canManageRole,
  isAdmin,
  isManager,
} from "@/lib/constants/roles";
import {
  getCycleStatusLabel,
  getCycleStatusDescription,
  getAssignmentStatusLabel,
} from "@/lib/constants/cycle-status";
import {
  getClimateSurveyTypeLabel,
  getClimateSurveyStatusLabel,
  getSurveyQuestionTypeLabel,
  getSurveyFrequencyLabel,
  getLikertLabel,
  getNPSCategoryData,
  getDefaultDimensions,
} from "@/lib/constants/climate-survey";

// ---------------------------------------------------------------------------
// roles.ts locale getters
// ---------------------------------------------------------------------------

describe("roles locale-aware getters", () => {
  it("getRoleLabel returns Spanish by default", () => {
    expect(getRoleLabel("ADMIN")).toBe("Administrador");
    expect(getRoleLabel("MANAGER")).toBe("Gerente");
    expect(getRoleLabel("MEMBER")).toBe("Miembro");
  });

  it("getRoleLabel returns English when locale=en", () => {
    expect(getRoleLabel("ADMIN", "en")).toBe("Admin");
    expect(getRoleLabel("MANAGER", "en")).toBe("Manager");
    expect(getRoleLabel("MEMBER", "en")).toBe("Member");
  });

  it("getRoleLabel falls back to the flat-map label for unknown locale", () => {
    expect(getRoleLabel("ADMIN", "fr")).toBe("Administrador");
  });

  it("getGlobalRoleLabel handles both locales", () => {
    expect(getGlobalRoleLabel("SUPER_ADMIN")).toBe("Super Admin");
    expect(getGlobalRoleLabel("USER")).toBe("Usuario");
    expect(getGlobalRoleLabel("USER", "en")).toBe("User");
  });

  it("getReviewerTypeLabel handles both locales", () => {
    expect(getReviewerTypeLabel("SELF")).toBe("Autoevaluación");
    expect(getReviewerTypeLabel("PEER", "en")).toBe("Peer");
    expect(getReviewerTypeLabel("DIRECT_REPORT", "en")).toBe("Direct Report");
  });

  it("getReviewerTypeDescription returns Spanish text by default", () => {
    expect(getReviewerTypeDescription("SELF")).toContain("Autoevaluación");
  });

  it("getReviewerTypeDescription returns English text on locale=en", () => {
    expect(getReviewerTypeDescription("SELF", "en")).toContain("Self-assessment");
  });

  it("getReviewerTypeDescription falls back on unknown locale", () => {
    expect(getReviewerTypeDescription("MANAGER", "de")).toContain(
      "gerente directo",
    );
  });
});

describe("role hierarchy helpers", () => {
  it("ROLE_HIERARCHY ranks ADMIN > MANAGER > MEMBER", () => {
    expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.MANAGER);
    expect(ROLE_HIERARCHY.MANAGER).toBeGreaterThan(ROLE_HIERARCHY.MEMBER);
  });

  it("canManageRole returns true when current outranks target", () => {
    expect(canManageRole("ADMIN", "MEMBER")).toBe(true);
    expect(canManageRole("MANAGER", "MEMBER")).toBe(true);
  });

  it("canManageRole returns false at the same level or below", () => {
    expect(canManageRole("MEMBER", "MEMBER")).toBe(false);
    expect(canManageRole("MEMBER", "MANAGER")).toBe(false);
  });

  it("isAdmin only matches ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MANAGER")).toBe(false);
    expect(isAdmin("MEMBER")).toBe(false);
  });

  it("isManager matches MANAGER and ADMIN", () => {
    expect(isManager("ADMIN")).toBe(true);
    expect(isManager("MANAGER")).toBe(true);
    expect(isManager("MEMBER")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cycle-status.ts locale getters
// ---------------------------------------------------------------------------

describe("cycle-status locale-aware getters", () => {
  it("getCycleStatusLabel returns Spanish by default", () => {
    expect(getCycleStatusLabel("DRAFT")).toBe("Borrador");
    expect(getCycleStatusLabel("IN_PROGRESS")).toBe("En Progreso");
  });

  it("getCycleStatusLabel returns English on locale=en", () => {
    expect(getCycleStatusLabel("DRAFT", "en")).toBe("Draft");
    expect(getCycleStatusLabel("NOMINATION", "en")).toBe("Nominations Open");
  });

  it("getCycleStatusDescription handles both locales", () => {
    expect(getCycleStatusDescription("DRAFT")).toContain("configurado");
    expect(getCycleStatusDescription("DRAFT", "en")).toContain("being configured");
  });

  it("getAssignmentStatusLabel handles both locales", () => {
    expect(getAssignmentStatusLabel("PENDING")).toBe("Sin Iniciar");
    expect(getAssignmentStatusLabel("PENDING", "en")).toBe("Not Started");
    expect(getAssignmentStatusLabel("DECLINED", "en")).toBe("Declined");
  });

  it("falls back to Spanish flat-map for unknown locale", () => {
    expect(getCycleStatusLabel("DRAFT", "xx")).toBe("Borrador");
  });
});

// ---------------------------------------------------------------------------
// climate-survey.ts locale getters
// ---------------------------------------------------------------------------

describe("climate-survey locale-aware getters", () => {
  it("getClimateSurveyTypeLabel — both locales", () => {
    expect(getClimateSurveyTypeLabel("CLIMATE")).toBe("Encuesta de Clima");
    expect(getClimateSurveyTypeLabel("CLIMATE", "en")).toBe("Climate Survey");
  });

  it("getClimateSurveyTypeLabel falls back to raw key for unknown type", () => {
    expect(getClimateSurveyTypeLabel("UNKNOWN_TYPE", "en")).toBe(
      "UNKNOWN_TYPE",
    );
  });

  it("getClimateSurveyStatusLabel — both locales", () => {
    expect(getClimateSurveyStatusLabel("ACTIVE")).toBe("Activa");
    expect(getClimateSurveyStatusLabel("ACTIVE", "en")).toBe("Active");
  });

  it("getSurveyQuestionTypeLabel — both locales", () => {
    expect(getSurveyQuestionTypeLabel("LIKERT")).toBe("Escala Likert (1-5)");
    expect(getSurveyQuestionTypeLabel("LIKERT", "en")).toBe(
      "Likert Scale (1-5)",
    );
  });

  it("getSurveyFrequencyLabel — both locales", () => {
    expect(getSurveyFrequencyLabel("ONCE")).toBe("Una vez");
    expect(getSurveyFrequencyLabel("ONCE", "en")).toBe("One-time");
  });

  it("getLikertLabel — both locales and numeric fallback", () => {
    expect(getLikertLabel(1)).toBe("Muy en Desacuerdo");
    expect(getLikertLabel(1, "en")).toBe("Strongly Disagree");
    expect(getLikertLabel(99)).toBe("99");
  });

  it("getNPSCategoryData returns Spanish by default", () => {
    expect(getNPSCategoryData("DETRACTOR")).toEqual(
      expect.objectContaining({ label: "Detractores" }),
    );
  });

  it("getNPSCategoryData returns English on locale=en", () => {
    expect(getNPSCategoryData("PROMOTER", "en")).toEqual(
      expect.objectContaining({ label: "Promoters" }),
    );
  });

  it("getDefaultDimensions returns Spanish by default", () => {
    const dims = getDefaultDimensions();
    expect(dims[0].name).toBe("Liderazgo");
  });

  it("getDefaultDimensions returns English on locale=en", () => {
    const dims = getDefaultDimensions("en");
    expect(dims[0].name).toBe("Leadership");
  });

  it("getDefaultDimensions falls back to Spanish on unknown locale", () => {
    const dims = getDefaultDimensions("fr");
    expect(dims[0].name).toBe("Liderazgo");
  });
});
