import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

import {
  sendInvitationEmail,
  sendNominationRequestEmail,
  sendReminderEmail,
  sendReportReleasedEmail,
  sendReviewRequestEmail,
} from "@/lib/email/templates";

function lastEmail() {
  return sendEmail.mock.calls.at(-1)![0] as { subject: string; html: string; text: string };
}

describe("360 email templates", () => {
  beforeEach(() => {
    sendEmail.mockReset();
  });

  it("writes review requests in Spanish by default", async () => {
    await sendReviewRequestEmail({
      to: "ana@acme.test",
      reviewerName: "Ana",
      revieweeName: "Luis",
      cycleName: "Ciclo 2026",
      dueDate: "16 nov 2026",
      reviewUrl: "https://app.test/r",
    });
    const email = lastEmail();

    expect(email.subject).toBe("Te pidieron retroalimentación sobre Luis");
    expect(email.html).toContain("Hola Ana,");
    expect(email.html).toContain("<strong>Luis</strong>");
    expect(email.html).toContain("Fecha límite:");
    expect(email.html).toContain("Comenzar evaluación");
    expect(email.html).not.toMatch(/Feedback|Due date|This email was sent/);
    expect(email.text).not.toContain("<strong>");
  });

  it("uses the self-review copy instead of 'yourself'", async () => {
    await sendReviewRequestEmail({
      to: "ana@acme.test",
      reviewerName: "",
      revieweeName: null,
      cycleName: "Ciclo 2026",
      dueDate: "16 nov 2026",
      reviewUrl: "https://app.test/r",
    });
    const email = lastEmail();

    expect(email.subject).toBe("Es momento de tu autoevaluación: Ciclo 2026");
    expect(email.html).toContain("Hola,");
    expect(email.html).not.toContain("yourself");
  });

  it("writes them in English for en companies", async () => {
    await sendReviewRequestEmail({
      to: "ann@acme.test",
      reviewerName: "Ann",
      revieweeName: "Lou",
      cycleName: "Cycle 2026",
      dueDate: "Nov 16, 2026",
      reviewUrl: "https://app.test/r",
      locale: "en",
    });
    const email = lastEmail();

    expect(email.subject).toBe("Feedback requested for Lou");
    expect(email.html).toContain("Start Review");
    expect(email.html).toContain("This email was sent by Kultiva");
  });

  it("pluralizes reminders", async () => {
    await sendReminderEmail({ to: "a@acme.test", pendingCount: 1, dueDate: "1 dic 2026", dashboardUrl: "https://app.test" });
    expect(lastEmail().subject).toBe("Recordatorio: 1 evaluación pendiente");
    await sendReminderEmail({ to: "a@acme.test", pendingCount: 3, dueDate: "Dec 1, 2026", dashboardUrl: "https://app.test", locale: "en" });
    expect(lastEmail().subject).toBe("Reminder: 3 pending reviews");
  });

  it("falls back to translated names on invitations and escapes them", async () => {
    await sendInvitationEmail({ to: "x@acme.test", inviterName: null, companyName: "<Acme>", inviteUrl: "https://app.test/i" });
    const email = lastEmail();

    expect(email.subject).toBe("Te invitaron a unirte a <Acme> en Kultiva");
    expect(email.html).toContain("Tu administrador te invitó a unirte a &lt;Acme&gt;");
    expect(email.html).not.toContain("<Acme>");
  });

  it("localizes report and nomination emails", async () => {
    await sendReportReleasedEmail({ to: "a@acme.test", employeeName: "Ana", cycleName: "Ciclo", reportUrl: "https://app.test" });
    expect(lastEmail().subject).toBe("Tu reporte de retroalimentación de «Ciclo» está listo");

    await sendNominationRequestEmail({
      to: "a@acme.test",
      employeeName: "Ana",
      cycleName: "Ciclo",
      minPeers: 2,
      maxPeers: 4,
      dueDate: "1 dic 2026",
      nominationUrl: "https://app.test",
    });
    expect(lastEmail().html).toContain("2-4 compañeros evaluadores");
  });
});
