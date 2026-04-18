import { describe, it, expect } from "vitest";
import {
  CYCLE_STATUS_LABELS,
  CYCLE_STATUS_DESCRIPTIONS,
  CYCLE_STATUS_COLORS,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_COLORS,
  CYCLE_STATUS_ORDER,
  canTransitionTo,
} from "@/lib/constants/cycle-status";

// ---------------------------------------------------------------------------
// canTransitionTo
// ---------------------------------------------------------------------------

describe("canTransitionTo", () => {
  it("allows DRAFT -> NOMINATION (forward by one step)", () => {
    expect(canTransitionTo("DRAFT", "NOMINATION")).toBe(true);
  });

  it("allows NOMINATION -> IN_PROGRESS (forward by one step)", () => {
    expect(canTransitionTo("NOMINATION", "IN_PROGRESS")).toBe(true);
  });

  it("allows IN_PROGRESS -> CLOSED (forward by one step)", () => {
    expect(canTransitionTo("IN_PROGRESS", "CLOSED")).toBe(true);
  });

  it("allows CLOSED -> ARCHIVED (forward by one step)", () => {
    expect(canTransitionTo("CLOSED", "ARCHIVED")).toBe(true);
  });

  it("allows transition to ARCHIVED from any state", () => {
    expect(canTransitionTo("DRAFT", "ARCHIVED")).toBe(true);
    expect(canTransitionTo("NOMINATION", "ARCHIVED")).toBe(true);
    expect(canTransitionTo("IN_PROGRESS", "ARCHIVED")).toBe(true);
    expect(canTransitionTo("CLOSED", "ARCHIVED")).toBe(true);
    expect(canTransitionTo("ARCHIVED", "ARCHIVED")).toBe(true);
  });

  it("disallows skipping a step (DRAFT -> IN_PROGRESS)", () => {
    expect(canTransitionTo("DRAFT", "IN_PROGRESS")).toBe(false);
  });

  it("disallows going backward (IN_PROGRESS -> DRAFT)", () => {
    expect(canTransitionTo("IN_PROGRESS", "DRAFT")).toBe(false);
  });

  it("disallows same-state transition (except ARCHIVED)", () => {
    expect(canTransitionTo("DRAFT", "DRAFT")).toBe(false);
    expect(canTransitionTo("IN_PROGRESS", "IN_PROGRESS")).toBe(false);
    expect(canTransitionTo("CLOSED", "CLOSED")).toBe(false);
  });

  it("disallows CLOSED -> NOMINATION (backward)", () => {
    expect(canTransitionTo("CLOSED", "NOMINATION")).toBe(false);
  });

  it("disallows DRAFT -> CLOSED (skipping two steps)", () => {
    expect(canTransitionTo("DRAFT", "CLOSED")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Static constants — structural integrity checks
// ---------------------------------------------------------------------------

describe("cycle status constants", () => {
  const ALL_STATUSES = ["DRAFT", "NOMINATION", "IN_PROGRESS", "CLOSED", "ARCHIVED"];

  it("CYCLE_STATUS_ORDER contains all statuses in correct progression", () => {
    expect(CYCLE_STATUS_ORDER).toEqual(ALL_STATUSES);
  });

  it("CYCLE_STATUS_LABELS has an entry for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(CYCLE_STATUS_LABELS).toHaveProperty(status);
      expect(typeof CYCLE_STATUS_LABELS[status as keyof typeof CYCLE_STATUS_LABELS]).toBe("string");
    }
  });

  it("CYCLE_STATUS_DESCRIPTIONS has an entry for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(CYCLE_STATUS_DESCRIPTIONS).toHaveProperty(status);
    }
  });

  it("CYCLE_STATUS_COLORS has an entry for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(CYCLE_STATUS_COLORS).toHaveProperty(status);
    }
  });

  it("ASSIGNMENT_STATUS_LABELS covers all assignment statuses", () => {
    const expected = ["PENDING", "IN_PROGRESS", "COMPLETED", "DECLINED"];
    for (const status of expected) {
      expect(ASSIGNMENT_STATUS_LABELS).toHaveProperty(status);
    }
  });

  it("ASSIGNMENT_STATUS_COLORS has same keys as ASSIGNMENT_STATUS_LABELS", () => {
    expect(Object.keys(ASSIGNMENT_STATUS_COLORS).sort()).toEqual(
      Object.keys(ASSIGNMENT_STATUS_LABELS).sort()
    );
  });
});
