import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isDateInPast,
  isDateInFuture,
  daysUntil,
  daysOverdue,
  getExpiryDate,
} from "@/lib/utils/dates";

describe("dates utils", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatDate", () => {
    it("formats a Date object with default format", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      expect(formatDate(date)).toBe("Jun 15, 2025");
    });

    it("formats an ISO string with default format", () => {
      expect(formatDate("2025-01-01")).toBe("Jan 1, 2025");
    });

    it("accepts custom format string", () => {
      const date = new Date("2025-06-15T12:00:00Z");
      expect(formatDate(date, "yyyy-MM-dd")).toBe("2025-06-15");
    });
  });

  describe("formatDateTime", () => {
    it("formats date with time", () => {
      const date = new Date("2025-06-15T14:30:00");
      const result = formatDateTime(date);
      expect(result).toContain("Jun 15, 2025");
      expect(result).toContain("at");
    });
  });

  describe("formatRelativeTime", () => {
    it("returns a relative time string", () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = formatRelativeTime(date);
      expect(result).toContain("ago");
    });
  });

  describe("isDateInPast", () => {
    it("returns true for past dates", () => {
      expect(isDateInPast(new Date("2020-01-01"))).toBe(true);
    });

    it("returns false for future dates", () => {
      expect(isDateInPast(new Date("2099-01-01"))).toBe(false);
    });

    it("handles string dates", () => {
      expect(isDateInPast("2020-01-01")).toBe(true);
    });
  });

  describe("isDateInFuture", () => {
    it("returns true for future dates", () => {
      expect(isDateInFuture(new Date("2099-01-01"))).toBe(true);
    });

    it("returns false for past dates", () => {
      expect(isDateInFuture(new Date("2020-01-01"))).toBe(false);
    });
  });

  describe("daysUntil", () => {
    it("returns positive number for future dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));
      expect(daysUntil(new Date("2025-06-11T12:00:00Z"))).toBe(10);
      vi.useRealTimers();
    });

    it("returns negative number for past dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-11T12:00:00Z"));
      expect(daysUntil(new Date("2025-06-01T12:00:00Z"))).toBe(-10);
      vi.useRealTimers();
    });
  });

  describe("daysOverdue", () => {
    it("returns positive for overdue dates", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-11T12:00:00Z"));
      expect(daysOverdue(new Date("2025-06-01T12:00:00Z"))).toBe(10);
      vi.useRealTimers();
    });
  });

  describe("getExpiryDate", () => {
    it("returns a date 14 days from now by default", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
      const expiry = getExpiryDate();
      expect(expiry.toISOString()).toBe("2025-06-15T00:00:00.000Z");
      vi.useRealTimers();
    });

    it("accepts custom number of days", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
      const expiry = getExpiryDate(7);
      expect(expiry.toISOString()).toBe("2025-06-08T00:00:00.000Z");
      vi.useRealTimers();
    });
  });
});
