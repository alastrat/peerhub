import { describe, it, expect } from "vitest";
import {
  generateToken,
  hashToken,
  generateSecureToken,
  verifyToken,
  generateInviteToken,
  generateReviewToken,
} from "@/lib/utils/tokens";

describe("generateToken", () => {
  it("returns a hex string of length 2*N for default N=32 (64 chars)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("respects an explicit byte length", () => {
    const token = generateToken(16);
    expect(token).toHaveLength(32);
  });

  it("produces different tokens on subsequent calls", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

describe("hashToken", () => {
  it("returns a hex SHA-256 digest (64 hex chars)", () => {
    const digest = hashToken("hello");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("produces different digests for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("generateSecureToken", () => {
  it("returns both a raw token and its hash", () => {
    const { token, hashedToken } = generateSecureToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hashedToken).toMatch(/^[0-9a-f]{64}$/);
    expect(hashedToken).toBe(hashToken(token));
  });
});

describe("verifyToken", () => {
  it("returns true when token matches its hash", () => {
    const { token, hashedToken } = generateSecureToken();
    expect(verifyToken(token, hashedToken)).toBe(true);
  });

  it("returns false when token does not match the hash", () => {
    const { hashedToken } = generateSecureToken();
    expect(verifyToken("not-the-token", hashedToken)).toBe(false);
  });
});

describe("generateInviteToken", () => {
  it("returns a hex string of length 48 (24 bytes)", () => {
    expect(generateInviteToken()).toMatch(/^[0-9a-f]{48}$/);
  });
});

describe("generateReviewToken", () => {
  it("returns a hex string of length 64 (32 bytes)", () => {
    expect(generateReviewToken()).toMatch(/^[0-9a-f]{64}$/);
  });
});
