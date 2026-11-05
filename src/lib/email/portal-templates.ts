import { sendEmail } from "./resend";
import { getTranslator, toSupportedLocale } from "@/i18n/translator";
import { COMPANY_FOOTER, EMAIL_COLORS } from "./email-constants";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kultiva";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const C = EMAIL_COLORS;

/**
 * Wraps email content in the shared layout: purple header with the logo, a
 * green accent line, the content and a footer. Tables and inline styles so
 * it holds up in Outlook and on phones. The footer follows `locale`.
 */
export function baseTemplate(content: string, locale?: string | null): string {
  const t = getTranslator(locale, "emails");
  return `
<!DOCTYPE html>
<html lang="${toSupportedLocale(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <title>${APP_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background: ${C.page}; }
    .content h1 { font-size: 22px; line-height: 1.3; font-weight: 700; margin: 0 0 16px 0; color: ${C.brand}; }
    .content p { margin: 0 0 16px 0; }
    .content ul { margin: 0 0 16px 0; padding-left: 20px; }
    .content li { margin: 0 0 8px 0; }
    .content a { color: ${C.brand}; }
    .button { display: inline-block; background: ${C.brand}; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0 16px 0; }
    .secondary-text { font-size: 13px; color: ${C.muted}; }
    .highlight { background: #f6f2f8; padding: 14px 16px; border-radius: 8px; margin: 0 0 16px 0; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px !important; }
      .header, .footer { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td class="header" style="background:${C.brand};padding:22px 32px;">
              <img src="${APP_URL}/brand/kultiva-logo-white.png" width="112" alt="kultiva" style="display:block;border:0;outline:none;width:112px;height:auto;color:#ffffff;font-family:${FONT};font-size:24px;font-weight:700;">
            </td>
          </tr>
          <tr><td style="background:${C.leaf};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
          <tr>
            <td class="content" style="padding:32px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.ink};">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="footer" style="padding:18px 32px 26px;border-top:1px solid ${C.line};font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted};">
              ${escapeHtml(t("footer", { appName: APP_NAME }))}<br>${escapeHtml(COMPANY_FOOTER)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/** A button that also renders in Outlook, then the same link as text in case the button doesn't work. */
export function emailButton(url: string, label: string, locale?: string | null): string {
  const t = getTranslator(locale, "emails");
  const href = escapeHtml(url);
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px 0;">
  <tr>
    <td align="center" bgcolor="${C.brand}" style="border-radius:8px;background:${C.brand};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 4px 0;font-size:13px;color:${C.muted};">${escapeHtml(t("button_fallback"))}</p>
<p style="margin:0 0 20px 0;font-size:13px;word-break:break-all;"><a href="${href}" style="color:${C.brand};">${href}</a></p>`;
}

/** The light green box used for optional blocks (e.g. "Qué sigue"). Takes trusted HTML. */
export function emailCallout(html: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
  <tr>
    <td style="background:${C.calloutBg};border:1px solid ${C.calloutBorder};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink};">${html}</td>
  </tr>
</table>`;
}

export async function sendPortalMagicLinkEmail(
  to: string,
  name: string,
  magicLinkUrl: string,
  locale?: string | null,
): Promise<void> {
  const t = getTranslator(locale, "emails");
  const greeting = t("greeting", { name });
  const body = t("portal_magic_link.body", { appName: APP_NAME });
  const expiry = t("portal_magic_link.expiry_note");

  const html = baseTemplate(`
    <h1>${escapeHtml(t("portal_magic_link.heading"))}</h1>
    <p>${escapeHtml(greeting)}</p>
    <p>${escapeHtml(body)}</p>
    <a href="${magicLinkUrl}" class="button">${escapeHtml(t("portal_magic_link.cta"))}</a>
    <p class="secondary-text">${escapeHtml(expiry)}</p>
  `, locale);

  await sendEmail({
    to,
    subject: t("portal_magic_link.subject", { appName: APP_NAME }),
    html,
    text: `${greeting} ${body} ${t("portal_magic_link.cta")}: ${magicLinkUrl} — ${expiry}`,
  });
}

export function buildSurveyInvitationEmail(opts: {
  employeeName: string;
  surveyName: string;
  dueDate: string;
  surveyUrl: string;
  isAnonymous: boolean;
  /** Company locale; defaults to Spanish. */
  locale?: string | null;
}): { subject: string; html: string; text: string } {
  const { employeeName, surveyName, dueDate, surveyUrl, isAnonymous, locale } = opts;
  const t = getTranslator(locale, "emails");
  const greeting = t("greeting", { name: employeeName });
  const cta = t("survey_invitation.cta");

  const anonymousNote = isAnonymous
    ? `<div class="highlight"><strong>${escapeHtml(t("survey_invitation.anonymous_title"))}</strong> ${escapeHtml(t("survey_invitation.anonymous_body"))}</div>`
    : "";

  const subject = t("survey_invitation.subject", { survey: surveyName });

  const html = baseTemplate(`
    <h1>${escapeHtml(t("survey_invitation.heading"))}</h1>
    <p>${escapeHtml(greeting)}</p>
    <p>${t.markup("survey_invitation.intro", {
      survey: escapeHtml(surveyName),
      strong: (chunks) => `<strong>${chunks}</strong>`,
    })}</p>
    ${anonymousNote}
    <div class="highlight">
      <strong>${escapeHtml(t("survey_invitation.due_label"))}</strong> ${escapeHtml(dueDate)}
    </div>
    <a href="${surveyUrl}" class="button">${escapeHtml(cta)}</a>
    <p class="secondary-text">${escapeHtml(t("survey_invitation.portal_note", { appName: APP_NAME }))}</p>
  `, locale);

  const intro = t.markup("survey_invitation.intro", { survey: surveyName, strong: (chunks) => chunks });
  const anonymous = isAnonymous ? `${t("survey_invitation.anonymous_title")} ` : "";
  const text = `${greeting} ${intro} ${t("survey_invitation.due_label")} ${dueDate}. ${anonymous}${cta}: ${surveyUrl}`;

  return { subject, html, text };
}
