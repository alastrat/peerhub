import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the resend module before importing the code under test
const mockSend = vi.fn();

vi.mock("resend", () => {
  class MockResend {
    emails = { send: mockSend };
  }
  return { Resend: MockResend };
});

// We need to control env vars — set them before the module loads
const originalEnv = { ...process.env };

describe("email/resend", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
    // Restore env to a known state
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.EMAIL_DEV_MODE = "false";
    process.env.EMAIL_FROM = "Test <test@example.com>";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ──────────────────────────────────────────────
  // EmailDeliveryError
  // ──────────────────────────────────────────────
  describe("EmailDeliveryError", () => {
    it("has correct name and properties", async () => {
      const { EmailDeliveryError } = await import("@/lib/email/resend");
      const error = new EmailDeliveryError("fail", ["a@b.com"], { code: 400 });
      expect(error.name).toBe("EmailDeliveryError");
      expect(error.message).toBe("fail");
      expect(error.recipients).toEqual(["a@b.com"]);
      expect(error.providerError).toEqual({ code: 400 });
    });

    it("works without providerError", async () => {
      const { EmailDeliveryError } = await import("@/lib/email/resend");
      const error = new EmailDeliveryError("fail", ["a@b.com"]);
      expect(error.providerError).toBeUndefined();
    });

    it("is an instance of Error", async () => {
      const { EmailDeliveryError } = await import("@/lib/email/resend");
      const error = new EmailDeliveryError("fail", ["a@b.com"]);
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ──────────────────────────────────────────────
  // sendEmail — dev mode
  // ──────────────────────────────────────────────
  describe("sendEmail — dev mode", () => {
    it("logs to console and returns fake id when EMAIL_DEV_MODE is true", async () => {
      process.env.EMAIL_DEV_MODE = "true";
      vi.resetModules();
      const { sendEmail } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.messageId).toMatch(/^dev-/);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("logs to console when RESEND_API_KEY is missing", async () => {
      delete process.env.RESEND_API_KEY;
      process.env.EMAIL_DEV_MODE = "false";
      vi.resetModules();
      const { sendEmail } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.messageId).toMatch(/^dev-/);
      consoleSpy.mockRestore();
    });

    it("handles array of recipients in dev mode", async () => {
      process.env.EMAIL_DEV_MODE = "true";
      vi.resetModules();
      const { sendEmail } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendEmail({
        to: ["a@b.com", "c@d.com"],
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.messageId).toMatch(/^dev-/);
      consoleSpy.mockRestore();
    });

    it("logs text content when provided instead of stripping html", async () => {
      process.env.EMAIL_DEV_MODE = "true";
      vi.resetModules();
      const { sendEmail } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
        text: "Hello plain text",
      });

      const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
      expect(logCalls).toContain("Hello plain text");
      consoleSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────────────
  // sendEmail — production mode
  // ──────────────────────────────────────────────
  describe("sendEmail — production mode", () => {
    it("sends email via Resend and returns message id", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg-123" }, error: null });
      const { sendEmail } = await import("@/lib/email/resend");

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>World</p>",
      });

      expect(result.messageId).toBe("msg-123");
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["user@example.com"],
          subject: "Hello",
          html: "<p>World</p>",
        })
      );
    });

    it("throws EmailDeliveryError when Resend returns error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Rate limit exceeded" },
      });
      const { sendEmail, EmailDeliveryError } = await import("@/lib/email/resend");

      await expect(
        sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>" })
      ).rejects.toThrow(EmailDeliveryError);
    });

    it("provides domain verification hint for domain-not-verified errors", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "The domain is not verified" },
      });
      const { sendEmail } = await import("@/lib/email/resend");

      await expect(
        sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>" })
      ).rejects.toThrow(/domain is not verified/i);
    });

    it("throws EmailDeliveryError when Resend returns no message id", async () => {
      mockSend.mockResolvedValue({ data: {}, error: null });
      const { sendEmail, EmailDeliveryError } = await import("@/lib/email/resend");

      await expect(
        sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>" })
      ).rejects.toThrow(EmailDeliveryError);
    });

    it("wraps unexpected errors in EmailDeliveryError", async () => {
      mockSend.mockRejectedValue(new Error("Network failure"));
      const { sendEmail, EmailDeliveryError } = await import("@/lib/email/resend");

      await expect(
        sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>" })
      ).rejects.toThrow(EmailDeliveryError);
    });

    it("wraps non-Error throws in EmailDeliveryError", async () => {
      mockSend.mockRejectedValue("string error");
      const { sendEmail, EmailDeliveryError } = await import("@/lib/email/resend");

      await expect(
        sendEmail({ to: "user@example.com", subject: "Test", html: "<p>Hi</p>" })
      ).rejects.toThrow(EmailDeliveryError);
    });

    it("converts string `to` to array before sending", async () => {
      mockSend.mockResolvedValue({ data: { id: "msg-456" }, error: null });
      const { sendEmail } = await import("@/lib/email/resend");

      await sendEmail({
        to: "single@example.com",
        subject: "Test",
        html: "<p>Hi</p>",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["single@example.com"] })
      );
    });
  });

  // ──────────────────────────────────────────────
  // sendBulkEmails
  // ──────────────────────────────────────────────
  describe("sendBulkEmails", () => {
    it("returns success for all emails when all succeed", async () => {
      process.env.EMAIL_DEV_MODE = "true";
      vi.resetModules();
      const { sendBulkEmails } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendBulkEmails([
        { to: "a@test.com", subject: "A", html: "<p>A</p>" },
        { to: "b@test.com", subject: "B", html: "<p>B</p>" },
      ]);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results.every((r) => r.success)).toBe(true);
      consoleSpy.mockRestore();
    });

    it("handles mixed success and failure results", async () => {
      // Use production mode so we can control mockSend
      mockSend
        .mockResolvedValueOnce({ data: { id: "msg-1" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "Bounced" } });

      const { sendBulkEmails } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await sendBulkEmails([
        { to: "ok@test.com", subject: "OK", html: "<p>OK</p>" },
        { to: "fail@test.com", subject: "Fail", html: "<p>Fail</p>" },
      ]);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
      consoleSpy.mockRestore();
    });

    it("returns empty results for empty input", async () => {
      process.env.EMAIL_DEV_MODE = "true";
      vi.resetModules();
      const { sendBulkEmails } = await import("@/lib/email/resend");

      const result = await sendBulkEmails([]);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("uses first element of array `to` as the primary recipient", async () => {
      process.env.EMAIL_DEV_MODE = "true";
      vi.resetModules();
      const { sendBulkEmails } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendBulkEmails([
        { to: ["first@test.com", "second@test.com"], subject: "Multi", html: "<p>Hi</p>" },
      ]);

      expect(result.results[0].to).toBe("first@test.com");
      consoleSpy.mockRestore();
    });

    it("does not throw even when individual emails fail", async () => {
      mockSend.mockRejectedValue(new Error("Total failure"));
      const { sendBulkEmails } = await import("@/lib/email/resend");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await sendBulkEmails([
        { to: "fail@test.com", subject: "Fail", html: "<p>Fail</p>" },
      ]);

      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});
