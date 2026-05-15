import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("joins basic class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("merges conflicting Tailwind utilities (later wins)", () => {
    // twMerge handles conflict resolution between `p-2` and `p-4`
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("filters out falsy values", () => {
    expect(cn("a", null, undefined, false, "b")).toBe("a b");
  });

  it("supports conditional objects", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });

  it("returns empty string when no inputs supplied", () => {
    expect(cn()).toBe("");
  });

  it("flattens nested arrays", () => {
    expect(cn(["a", ["b", ["c"]]])).toBe("a b c");
  });
});
