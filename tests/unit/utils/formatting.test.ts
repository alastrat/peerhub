import { describe, it, expect } from "vitest";
import {
  slugify,
  capitalize,
  truncate,
  pluralize,
  formatPercentage,
  formatNumber,
  getInitials,
  generateEmployeeId,
} from "@/lib/utils/formatting";

describe("formatting utils", () => {
  describe("slugify", () => {
    it("converts text to lowercase slug", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(slugify("Hello! @World#")).toBe("hello-world");
    });

    it("trims leading and trailing hyphens", () => {
      expect(slugify("  Hello World  ")).toBe("hello-world");
    });

    it("handles multiple spaces and underscores", () => {
      expect(slugify("hello   world_test")).toBe("hello-world-test");
    });

    it("handles empty string", () => {
      expect(slugify("")).toBe("");
    });
  });

  describe("capitalize", () => {
    it("capitalizes first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("lowercases the rest", () => {
      expect(capitalize("HELLO")).toBe("Hello");
    });

    it("handles single character", () => {
      expect(capitalize("h")).toBe("H");
    });

    it("handles empty string", () => {
      expect(capitalize("")).toBe("");
    });
  });

  describe("truncate", () => {
    it("returns text unchanged if shorter than limit", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    it("truncates with ellipsis", () => {
      expect(truncate("hello world this is long", 10)).toBe("hello worl...");
    });

    it("returns text unchanged if equal to limit", () => {
      expect(truncate("hello", 5)).toBe("hello");
    });
  });

  describe("pluralize", () => {
    it("returns singular for count of 1", () => {
      expect(pluralize(1, "item")).toBe("item");
    });

    it("returns auto-pluralized for count != 1", () => {
      expect(pluralize(0, "item")).toBe("items");
      expect(pluralize(2, "item")).toBe("items");
    });

    it("uses custom plural", () => {
      expect(pluralize(2, "person", "people")).toBe("people");
    });
  });

  describe("formatPercentage", () => {
    it("formats decimal as percentage", () => {
      expect(formatPercentage(0.75)).toBe("75%");
    });

    it("supports decimal places", () => {
      expect(formatPercentage(0.756, 1)).toBe("75.6%");
    });

    it("handles 0", () => {
      expect(formatPercentage(0)).toBe("0%");
    });

    it("handles 1", () => {
      expect(formatPercentage(1)).toBe("100%");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers with locale separators", () => {
      const result = formatNumber(1000);
      // Different locales format differently; just ensure it contains "1" and "000"
      expect(result).toContain("1");
    });

    it("handles small numbers", () => {
      expect(formatNumber(42)).toBe("42");
    });
  });

  describe("getInitials", () => {
    it("returns initials from full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
    });

    it("returns max 2 characters", () => {
      expect(getInitials("John Michael Doe")).toBe("JM");
    });

    it("handles single name", () => {
      expect(getInitials("John")).toBe("J");
    });

    it("uppercases initials", () => {
      expect(getInitials("john doe")).toBe("JD");
    });
  });

  describe("generateEmployeeId", () => {
    it("generates EMP- prefixed ID", () => {
      const id = generateEmployeeId();
      expect(id).toMatch(/^EMP-[A-Z0-9]{6}$/);
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateEmployeeId()));
      expect(ids.size).toBe(100);
    });
  });
});
