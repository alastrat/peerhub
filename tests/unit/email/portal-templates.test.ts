import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

import {
  baseTemplate,
  buildSurveyInvitationEmail,
  sendPortalMagicLinkEmail,
} from "@/lib/email/portal-templates";

const invitation = {
  employeeName: "Ana",
  surveyName: "Clima 2026",
  dueDate: "16 de noviembre de 2026",
  surveyUrl: "https://app.test/portal",
  isAnonymous: true,
};

describe("portal email templates", () => {
  beforeEach(() => {
    sendEmail.mockReset();
  });

  it("writes the survey invitation in Spanish by default", () => {
    const email = buildSurveyInvitationEmail(invitation);

    expect(email.subject).toBe("Te invitamos a responder: Clima 2026");
    expect(email.html).toContain('lang="es"');
    expect(email.html).toContain("Te invitamos a responder <strong>Clima 2026</strong>");
    expect(email.html).toContain("Tus respuestas son anónimas.");
    expect(email.html).toContain("Responder encuesta");
    expect(email.html).not.toMatch(/You've|Complete Survey|This email was sent/);
    expect(email.text).toBe(
      "Hola Ana, Te invitamos a responder Clima 2026. Tu opinión es importante y nos ayuda a mejorar. " +
        "Fecha límite: 16 de noviembre de 2026. Tus respuestas son anónimas. Responder encuesta: https://app.test/portal",
    );
  });

  it("writes the survey invitation in English for en companies", () => {
    const email = buildSurveyInvitationEmail({ ...invitation, isAnonymous: false, locale: "en" });

    expect(email.subject).toBe("You've been invited to complete: Clima 2026");
    expect(email.html).toContain('lang="en"');
    expect(email.html).toContain("Complete Survey");
    expect(email.html).toContain("This email was sent by Kultiva");
    expect(email.html).not.toContain("Your answers are anonymous.");
  });

  it("escapes the employee and survey names", () => {
    const email = buildSurveyInvitationEmail({ ...invitation, employeeName: "<i>Ana</i>", surveyName: "<b>x</b>" });

    expect(email.html).toContain("<strong>&lt;b&gt;x&lt;/b&gt;</strong>");
    expect(email.html).toContain("Hola &lt;i&gt;Ana&lt;/i&gt;,");
    expect(email.html).not.toContain("<b>x</b>");
  });

  it("localizes the shared footer", () => {
    expect(baseTemplate("<p>x</p>")).toContain("comunícate con el área de Recursos Humanos");
    expect(baseTemplate("<p>x</p>", "en")).toContain("please contact your HR administrator");
  });

  it("sends the portal magic link with the shared button and the link spelled out", async () => {
    await sendPortalMagicLinkEmail("ana@acme.test", "Ana", "https://app.test/portal/verify/t?redirect=%2Fportal%2Fhome&x=1");
    const { html } = sendEmail.mock.calls[0][0] as { html: string };

    expect(html).toContain("Ingresar al portal</a>");
    expect(html.split('href="https://app.test/portal/verify/t?redirect=%2Fportal%2Fhome&amp;x=1"')).toHaveLength(3);
    expect(html).toContain("Si el botón no funciona");
    expect(html).not.toContain('class="button"');
  });

  it("sends the portal magic link in the company's language", async () => {
    await sendPortalMagicLinkEmail("ana@acme.test", "Ana", "https://app.test/portal/verify/t", "es");
    await sendPortalMagicLinkEmail("ann@acme.test", "Ann", "https://app.test/portal/verify/u", "en");

    expect(sendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: "ana@acme.test",
        subject: "Accede a tu portal de Kultiva",
        html: expect.stringContaining("Ingresar al portal"),
        text: expect.stringContaining("Ingresar al portal: https://app.test/portal/verify/t"),
      }),
    );
    expect(sendEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: "ann@acme.test", subject: "Access your Kultiva portal" }),
    );
  });
});
