// Emails for signing in and for joining as a company admin: the login link
// NextAuth sends and the admin invitation a super admin triggers. Pure
// builders on the shared layout; callers keep their own sending and error
// handling.

import { getTranslator } from "@/i18n/translator";
import type { BuiltEmail } from "./climate-result-emails";
import { baseTemplate, emailButton, escapeHtml } from "./portal-templates";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kultiva";

/** The one-time sign-in link. `url` is NextAuth's callback URL for this address. */
export function buildLoginLinkEmail(opts: { url: string; locale?: string | null }): BuiltEmail {
  const { url, locale } = opts;
  const t = getTranslator(locale, "emails");
  const values = { appName: APP_NAME };
  const greeting = t("greeting_no_name");
  const body = t("login_link.body", values);
  const cta = t("login_link.cta");
  const note = t("login_link.note");

  const html = baseTemplate(
    `
    <h1>${escapeHtml(t("login_link.heading", values))}</h1>
    <p>${escapeHtml(greeting)}</p>
    <p>${escapeHtml(body)}</p>
    ${emailButton(url, cta, locale)}
    <p class="secondary-text">${escapeHtml(note)}</p>
  `,
    locale,
  );

  return {
    subject: t("login_link.subject", values),
    html,
    text: [greeting, body, `${cta}: ${url}`, note].join("\n\n"),
  };
}

/** Invites someone to run a company a super admin just created. */
export function buildAdminInvitationEmail(opts: {
  /** First name, or the start of the address when none was given. */
  inviteeName: string;
  inviterName: string;
  companyName: string;
  inviteUrl: string;
  locale?: string | null;
}): BuiltEmail {
  const { inviteeName, inviteUrl, locale } = opts;
  const t = getTranslator(locale, "emails");
  const values = { inviter: opts.inviterName, company: opts.companyName, appName: APP_NAME };
  const greeting = t("greeting", { name: inviteeName });
  const body = t("admin_invitation.body", values);
  const cta = t("admin_invitation.cta");
  const expiry = t("invitation.expiry");

  const html = baseTemplate(
    `
    <h1>${escapeHtml(t("admin_invitation.heading"))}</h1>
    <p>${escapeHtml(greeting)}</p>
    <p>${escapeHtml(body)}</p>
    ${emailButton(inviteUrl, cta, locale)}
    <p class="secondary-text">${escapeHtml(expiry)}</p>
  `,
    locale,
  );

  return {
    subject: t("admin_invitation.subject", values),
    html,
    text: [greeting, body, `${cta}: ${inviteUrl}`, expiry].join("\n\n"),
  };
}
