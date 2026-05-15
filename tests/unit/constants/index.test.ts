import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  APP_DESCRIPTION,
  DEFAULT_ANONYMITY_THRESHOLD,
  DEFAULT_MIN_PEERS,
  DEFAULT_MAX_PEERS,
  DEFAULT_TOKEN_EXPIRY_DAYS,
  DEFAULT_INVITATION_EXPIRY_DAYS,
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  CSV_MAX_FILE_SIZE,
  CSV_REQUIRED_COLUMNS,
  CSV_OPTIONAL_COLUMNS,
  // Re-exports from sub-modules:
  ROLE_LABELS,
  CYCLE_STATUS_LABELS,
  DEFAULT_RATING_SCALE,
} from "@/lib/constants";

describe("platform constants", () => {
  it("APP_NAME is Kultiva", () => {
    expect(APP_NAME).toBe("Kultiva");
  });

  it("APP_DESCRIPTION is non-empty", () => {
    expect(APP_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it("anonymity / peers / expiry defaults are positive integers", () => {
    expect(DEFAULT_ANONYMITY_THRESHOLD).toBeGreaterThan(0);
    expect(DEFAULT_MIN_PEERS).toBeGreaterThan(0);
    expect(DEFAULT_MAX_PEERS).toBeGreaterThanOrEqual(DEFAULT_MIN_PEERS);
    expect(DEFAULT_TOKEN_EXPIRY_DAYS).toBeGreaterThan(0);
    expect(DEFAULT_INVITATION_EXPIRY_DAYS).toBeGreaterThan(0);
  });

  it("pagination max >= default", () => {
    expect(PAGINATION_MAX_PAGE_SIZE).toBeGreaterThanOrEqual(
      PAGINATION_DEFAULT_PAGE_SIZE,
    );
  });

  it("CSV size limit is 5MB", () => {
    expect(CSV_MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it("CSV required columns include email and name", () => {
    expect(CSV_REQUIRED_COLUMNS).toEqual(["email", "name"]);
  });

  it("CSV optional columns include managerEmail and department", () => {
    expect(CSV_OPTIONAL_COLUMNS).toEqual(
      expect.arrayContaining(["managerEmail", "department"]),
    );
  });

  it("re-exports ROLE_LABELS, CYCLE_STATUS_LABELS, DEFAULT_RATING_SCALE", () => {
    expect(ROLE_LABELS).toBeDefined();
    expect(CYCLE_STATUS_LABELS).toBeDefined();
    expect(DEFAULT_RATING_SCALE).toBeDefined();
  });
});
