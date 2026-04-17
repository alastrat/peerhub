import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock cookies from next/headers
// ---------------------------------------------------------------------------

const mockCookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// Mock jose for JWT operations
// We use a module-level variable so we can spy on calls from tests.
// vi.hoisted ensures the variable is available when the factory runs.
const { mockSignFn } = vi.hoisted(() => ({
  mockSignFn: vi.fn().mockResolvedValue("mock-jwt-token"),
}));

vi.mock("jose", () => {
  class SignJWT {
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    sign() { return mockSignFn(); }
  }
  return { SignJWT, jwtVerify: vi.fn() };
});

// Import AFTER mocks
import {
  createPortalSession,
  getPortalSession,
  clearPortalSession,
} from "@/lib/auth/portal-session";
import { jwtVerify } from "jose";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("portal-session", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PORTAL_SECRET = "test-portal-secret";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // createPortalSession
  // =========================================================================

  describe("createPortalSession", () => {
    it("creates a JWT and sets it as an httpOnly cookie", async () => {
      await createPortalSession("emp-1", "company-1", "alice@acme.com");

      expect(mockSignFn).toHaveBeenCalled();
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "portal-session",
        "mock-jwt-token",
        {
          httpOnly: true,
          secure: false, // NODE_ENV is "test", not "production"
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        }
      );
    });

    it("sets secure flag in production", async () => {
      process.env.NODE_ENV = "production";

      await createPortalSession("emp-1", "company-1", "alice@acme.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "portal-session",
        "mock-jwt-token",
        expect.objectContaining({ secure: true })
      );
    });

    it("throws when no secret is configured", async () => {
      delete process.env.PORTAL_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      await expect(
        createPortalSession("emp-1", "company-1", "alice@acme.com")
      ).rejects.toThrow("Missing PORTAL_SECRET or NEXTAUTH_SECRET");
    });

    it("falls back to NEXTAUTH_SECRET when PORTAL_SECRET is missing", async () => {
      delete process.env.PORTAL_SECRET;
      process.env.NEXTAUTH_SECRET = "nextauth-fallback-secret";

      // Should not throw
      await createPortalSession("emp-1", "company-1", "alice@acme.com");

      expect(mockSignFn).toHaveBeenCalled();
      expect(mockCookieStore.set).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getPortalSession
  // =========================================================================

  describe("getPortalSession", () => {
    it("returns null when no cookie is present", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getPortalSession();

      expect(result).toBeNull();
      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it("returns null when cookie value is empty", async () => {
      mockCookieStore.get.mockReturnValue({ value: "" });

      // Empty string is falsy, so should return null
      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns session payload for valid JWT", async () => {
      mockCookieStore.get.mockReturnValue({ value: "valid-jwt-token" });
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          employeeId: "emp-1",
          companyId: "company-1",
          email: "alice@acme.com",
        },
        protectedHeader: { alg: "HS256" },
      } as never);

      const result = await getPortalSession();

      expect(result).toEqual({
        employeeId: "emp-1",
        companyId: "company-1",
        email: "alice@acme.com",
      });
    });

    it("returns null when JWT verification fails (expired/invalid)", async () => {
      mockCookieStore.get.mockReturnValue({ value: "bad-jwt-token" });
      vi.mocked(jwtVerify).mockRejectedValue(new Error("JWT expired"));

      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns null when payload is missing employeeId", async () => {
      mockCookieStore.get.mockReturnValue({ value: "jwt-token" });
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          employeeId: "",
          companyId: "company-1",
          email: "alice@acme.com",
        },
        protectedHeader: { alg: "HS256" },
      } as never);

      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns null when payload is missing companyId", async () => {
      mockCookieStore.get.mockReturnValue({ value: "jwt-token" });
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          employeeId: "emp-1",
          companyId: "",
          email: "alice@acme.com",
        },
        protectedHeader: { alg: "HS256" },
      } as never);

      const result = await getPortalSession();

      expect(result).toBeNull();
    });

    it("returns null when payload is missing email", async () => {
      mockCookieStore.get.mockReturnValue({ value: "jwt-token" });
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: {
          employeeId: "emp-1",
          companyId: "company-1",
          email: "",
        },
        protectedHeader: { alg: "HS256" },
      } as never);

      const result = await getPortalSession();

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // clearPortalSession
  // =========================================================================

  describe("clearPortalSession", () => {
    it("sets cookie with empty value and maxAge 0", async () => {
      await clearPortalSession();

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "portal-session",
        "",
        {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        }
      );
    });

    it("sets secure flag in production when clearing", async () => {
      process.env.NODE_ENV = "production";

      await clearPortalSession();

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "portal-session",
        "",
        expect.objectContaining({ secure: true })
      );
    });
  });
});
