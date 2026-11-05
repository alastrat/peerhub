import { describe, it, expect } from "vitest";
import { buildAdminInvitationEmail, buildLoginLinkEmail } from "@/lib/email/auth-emails";

const loginUrl = "https://app.test/api/auth/callback/email?callbackUrl=%2Foverview&token=abc123&email=ana%40acme.test";

describe("login link email", () => {
  it("writes the login link in Spanish by default, on the shared layout", () => {
    const email = buildLoginLinkEmail({ url: loginUrl });

    expect(email.subject).toBe("Inicia sesión en Kultiva");
    expect(email.html).toContain('lang="es"');
    expect(email.html).toContain("Inicia sesión en Kultiva</h1>");
    expect(email.html).toContain("Haz clic en el botón para iniciar sesión en tu cuenta de Kultiva.");
    expect(email.html).toContain("Iniciar sesión</a>");
    expect(email.html).toContain("Si no solicitaste este correo, puedes ignorarlo.");
    // header, button and footer of the shared layout; none of the old PeerHub/blue markup
    expect(email.html).toContain("kultiva-logo-white.png");
    expect(email.html).toContain("#613171");
    expect(email.html).toContain("Si el botón no funciona, copia y pega este enlace");
    expect(email.html).toContain("Este correo fue enviado por Kultiva");
    expect(email.html).not.toMatch(/PeerHub|#0066FF|Sign in|safely ignore/);
  });

  it("keeps the exact link in the button, the fallback line and the plain text", () => {
    const email = buildLoginLinkEmail({ url: loginUrl });
    const escaped = loginUrl.replace(/&/g, "&amp;");

    expect(email.html.split(`href="${escaped}"`)).toHaveLength(3); // button + fallback link
    expect(email.text).toContain(`Iniciar sesión: ${loginUrl}`);
    expect(email.text).toBe(
      [
        "Hola,",
        "Haz clic en el botón para iniciar sesión en tu cuenta de Kultiva.",
        `Iniciar sesión: ${loginUrl}`,
        "Si no solicitaste este correo, puedes ignorarlo.",
      ].join("\n\n"),
    );
  });

  it("writes the login link in English when asked", () => {
    const email = buildLoginLinkEmail({ url: loginUrl, locale: "en" });

    expect(email.subject).toBe("Sign in to Kultiva");
    expect(email.html).toContain('lang="en"');
    expect(email.html).toContain("Click the button below to sign in to your Kultiva account.");
    expect(email.html).toContain("Sign In</a>");
    expect(email.html).toContain("If you didn&#39;t request this email, you can safely ignore it.");
    expect(email.html).toContain("This email was sent by Kultiva");
    expect(email.text).toContain(`Sign In: ${loginUrl}`);
    expect(email.html).not.toMatch(/Inicia|Hola/);
  });
});

describe("admin invitation email", () => {
  const invitation = {
    inviteeName: "Lina",
    inviterName: "Iskya Boom",
    companyName: "Top Management",
    inviteUrl: "https://app.test/invite/tok-1",
  };

  it("invites the admin in Spanish by default, with the 7-day expiry", () => {
    const email = buildAdminInvitationEmail(invitation);

    expect(email.subject).toBe("Te invitaron a administrar Top Management en Kultiva");
    expect(email.html).toContain("Te invitaron como administrador</h1>");
    expect(email.html).toContain("Hola Lina,");
    expect(email.html).toContain("Iskya Boom te invitó a administrar Top Management en Kultiva.");
    expect(email.html).toContain("Aceptar invitación</a>");
    expect(email.html).toContain('href="https://app.test/invite/tok-1"');
    expect(email.html).toContain("Esta invitación vence en 7 días.");
    expect(email.html).toContain("kultiva-logo-white.png");
    expect(email.text).toContain("Aceptar invitación: https://app.test/invite/tok-1");
    expect(email.text).toContain("Esta invitación vence en 7 días.");
  });

  it("follows the company's language", () => {
    const email = buildAdminInvitationEmail({ ...invitation, locale: "en" });

    expect(email.subject).toBe("You're invited to administer Top Management on Kultiva");
    expect(email.html).toContain("You&#39;ve been invited as an admin</h1>");
    expect(email.html).toContain("Hi Lina,");
    expect(email.html).toContain("Accept Invitation</a>");
    expect(email.html).toContain("This invitation will expire in 7 days.");
    expect(email.html).not.toMatch(/Aceptar|Hola/);
  });

  it("escapes the names in the html but not in the subject or text", () => {
    const email = buildAdminInvitationEmail({
      ...invitation,
      inviteeName: "<b>Lina</b>",
      inviterName: "A & B",
      companyName: "<i>Acme</i>",
    });

    expect(email.html).toContain("Hola &lt;b&gt;Lina&lt;/b&gt;,");
    expect(email.html).toContain("A &amp; B te invitó a administrar &lt;i&gt;Acme&lt;/i&gt;");
    expect(email.html).not.toContain("<i>Acme</i>");
    expect(email.subject).toBe("Te invitaron a administrar <i>Acme</i> en Kultiva");
    expect(email.text).toContain("A & B te invitó");
  });
});
