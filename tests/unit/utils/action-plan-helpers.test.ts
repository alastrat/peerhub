import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { isTaskOverdue, planImpact, planProgress, startOfToday } from "@/lib/queries/action-plans";

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

describe("isTaskOverdue", () => {
  const now = new Date(2026, 10, 3, 15, 0);

  it("is overdue only from the day after the due date", () => {
    // Due dates come from <input type="date"> → UTC midnight of that day
    expect(isTaskOverdue({ dueDate: new Date("2026-11-03"), status: "PENDING" }, now)).toBe(false);
    expect(isTaskOverdue({ dueDate: new Date("2026-11-04"), status: "PENDING" }, now)).toBe(false);
    expect(isTaskOverdue({ dueDate: new Date("2026-11-02"), status: "PENDING" }, now)).toBe(true);
  });

  it("does not flag a task due today late in the evening (UTC−5 user)", () => {
    const evening = new Date(2026, 10, 3, 23, 30);
    expect(isTaskOverdue({ dueDate: new Date("2026-11-03"), status: "PENDING" }, evening)).toBe(false);
  });

  it("never flags done or cancelled tasks", () => {
    const past = new Date(2026, 0, 1);
    expect(isTaskOverdue({ dueDate: past, status: "DONE" }, now)).toBe(false);
    expect(isTaskOverdue({ dueDate: past, status: "CANCELLED" }, now)).toBe(false);
    expect(isTaskOverdue({ dueDate: past, status: "IN_PROGRESS" }, now)).toBe(true);
  });

  it("computes the start of today in local time", () => {
    expect(startOfToday(now)).toEqual(new Date(2026, 10, 3));
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
