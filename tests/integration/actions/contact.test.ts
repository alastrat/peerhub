import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmailMock = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

import { submitContactForm } from "@/lib/actions/contact";

describe("submitContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmailMock.mockResolvedValue({ success: true, messageId: "test" });
  });

  it("rejects empty name", async () => {
    const result = await submitContactForm({
      name: "",
      email: "valid@example.com",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid_input");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid email", async () => {
    const result = await submitContactForm({
      name: "Ana",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid_input");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends email and returns success on valid input", async () => {
    const result = await submitContactForm({
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "+57 300 000 0000",
      message: "Quisiera agendar una consulta.",
    });

    expect(result.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const call = sendEmailMock.mock.calls[0][0];
    expect(call.to).toBe("comercial@kultiva.com.co");
    expect(call.subject).toContain("Ana Pérez");
    expect(call.text).toContain("ana@example.com");
    expect(call.text).toContain("+57 300 000 0000");
    expect(call.text).toContain("Quisiera agendar una consulta.");
  });

  it("escapes HTML in user input", async () => {
    await submitContactForm({
      name: '<script>alert("x")</script>',
      email: "user@example.com",
      message: "<b>bold</b>",
    });

    const call = sendEmailMock.mock.calls[0][0];
    expect(call.html).toContain("&lt;script&gt;");
    expect(call.html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(call.html).not.toContain("<script>");
  });

  it("works without optional phone and message", async () => {
    const result = await submitContactForm({
      name: "Ana",
      email: "ana@example.com",
    });

    expect(result.success).toBe(true);
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.text).not.toContain("Teléfono:");
    expect(call.text).toContain("(sin mensaje)");
  });

  it("returns send_failed when sendEmail fails", async () => {
    sendEmailMock.mockResolvedValueOnce({
      success: false,
      error: "domain not verified",
    });

    const result = await submitContactForm({
      name: "Ana",
      email: "ana@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("send_failed");
  });
});
