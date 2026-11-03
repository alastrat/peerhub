import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { isTaskOverdue, planImpact, planProgress } from "@/lib/queries/action-plans";
import { businessDay, businessDayAsDate } from "@/lib/constants/business-time";

describe("planProgress", () => {
  it("ignores cancelled tasks", () => {
    expect(planProgress([{ status: "DONE" }, { status: "PENDING" }, { status: "CANCELLED" }])).toEqual({
      done: 1,
      total: 2,
      pct: 50,
    });
  });

  it("handles plans with no tasks", () => {
    expect(planProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe("isTaskOverdue (business time zone: America/Bogota, UTC−5)", () => {
  // Instants are explicit UTC so the result can't depend on the machine's zone
  const afternoon = new Date("2026-11-03T20:00:00Z"); // 15:00 in Bogotá, Nov 3

  it("is overdue only from the business day after the due date", () => {
    // Due dates come from <input type="date"> → UTC midnight of that day
    expect(isTaskOverdue({ dueDate: new Date("2026-11-03"), status: "PENDING" }, afternoon)).toBe(false);
    expect(isTaskOverdue({ dueDate: new Date("2026-11-04"), status: "PENDING" }, afternoon)).toBe(false);
    expect(isTaskOverdue({ dueDate: new Date("2026-11-02"), status: "PENDING" }, afternoon)).toBe(true);
  });

  it("does not flag a task due today in the Bogotá evening, when UTC is already tomorrow", () => {
    const evening = new Date("2026-11-04T01:00:00Z"); // 20:00 in Bogotá, Nov 3
    expect(isTaskOverdue({ dueDate: new Date("2026-11-03"), status: "PENDING" }, evening)).toBe(false);
  });

  it("flags it once the business day has passed", () => {
    const midnight = new Date("2026-11-04T05:00:00Z"); // 00:00 in Bogotá, Nov 4
    expect(isTaskOverdue({ dueDate: new Date("2026-11-03"), status: "PENDING" }, midnight)).toBe(true);
  });

  it("never flags done or cancelled tasks", () => {
    const past = new Date("2026-01-01");
    expect(isTaskOverdue({ dueDate: past, status: "DONE" }, afternoon)).toBe(false);
    expect(isTaskOverdue({ dueDate: past, status: "CANCELLED" }, afternoon)).toBe(false);
    expect(isTaskOverdue({ dueDate: past, status: "IN_PROGRESS" }, afternoon)).toBe(true);
  });
});

describe("businessDay", () => {
  it("returns the calendar day in the business time zone", () => {
    expect(businessDay(new Date("2026-11-04T01:00:00Z"))).toBe("2026-11-03");
    expect(businessDay(new Date("2026-11-04T05:00:00Z"))).toBe("2026-11-04");
    expect(businessDay(new Date("2026-11-04T01:00:00Z"), "UTC")).toBe("2026-11-04");
  });

  it("stores a business day like a date input (UTC midnight)", () => {
    expect(businessDayAsDate(new Date("2026-11-04T01:00:00Z")).toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });
});

describe("planImpact", () => {
  it("is pending until evaluated", () => {
    expect(planImpact("DESFAVORABLE", undefined)).toBeNull();
    expect(planImpact("DESFAVORABLE", { evaluatedAt: null, resultBand: null })).toBeNull();
  });

  it("classifies evaluated outcomes", () => {
    const at = new Date();
    expect(planImpact("DESFAVORABLE", { evaluatedAt: at, resultBand: "FAVORABLE" })).toBe("IMPROVED");
    expect(planImpact("DESFAVORABLE", { evaluatedAt: at, resultBand: null })).toBe("NOT_EVALUABLE");
  });
});
