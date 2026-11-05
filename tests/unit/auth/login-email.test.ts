/**
 * The sign-in link NextAuth emails (login, signup and invite acceptance all go
 * through it): sent through Resend with the shared email layout.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));

type VerificationParams = { identifier: string; url: string };

async function loadSendVerificationRequest() {
  vi.resetModules();
  const { authOptions } = await import("@/lib/auth/config");
  const provider = authOptions.providers.find((p) => p.id === "email") as unknown as {
    options: { sendVerificationRequest: (params: VerificationParams) => Promise<void> };
  };
  return provider.options.sendVerificationRequest;
}

const url = "https://app.test/api/auth/callback/email?callbackUrl=%2Foverview&token=abc&email=ana%40acme.test";

describe("sign-in link email", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: "msg-1" }, error: null });
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_DEV_MODE", "false");
    vi.stubEnv("EMAIL_FROM", "Kultiva <noreply@kultiva.test>");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends the link through Resend on the shared layout, with a plain-text copy", async () => {
    const sendVerificationRequest = await loadSendVerificationRequest();
    await sendVerificationRequest({ identifier: "ana@acme.test", url });

    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0] as { from: string; to: string; subject: string; html: string; text: string };
    expect(mail.from).toBe("Kultiva <noreply@kultiva.test>");
    expect(mail.to).toBe("ana@acme.test");
    expect(mail.subject).toBe("Inicia sesión en Kultiva");
    expect(mail.html).toContain("kultiva-logo-white.png");
    expect(mail.html).toContain(`href="${url.replace(/&/g, "&amp;")}"`);
    expect(mail.html).not.toContain("PeerHub");
    expect(mail.text).toContain(`Iniciar sesión: ${url}`);
  });

  it("falls back to a Kultiva sender when EMAIL_FROM isn't set", async () => {
    vi.stubEnv("EMAIL_FROM", "");
    const sendVerificationRequest = await loadSendVerificationRequest();
    await sendVerificationRequest({ identifier: "ana@acme.test", url });

    expect(send.mock.calls[0][0].from).toBe("Kultiva <noreply@kultiva.com>");
  });

  it("only logs the link in dev mode", async () => {
    vi.stubEnv("EMAIL_DEV_MODE", "true");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const sendVerificationRequest = await loadSendVerificationRequest();
    await sendVerificationRequest({ identifier: "ana@acme.test", url });

    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(`URL: ${url}`);
    log.mockRestore();
  });
});
