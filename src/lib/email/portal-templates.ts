import { sendEmail } from "./resend";
import { getTranslator, toSupportedLocale } from "@/i18n/translator";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kultiva";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Wraps email content in the shared layout; the footer follows `locale` (company locale). */
export function baseTemplate(content: string, locale?: string | null): string {
  const t = getTranslator(locale, "emails");
  return `
<!DOCTYPE html>
<html lang="${toSupportedLocale(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #171717;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #fafafa;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #0066FF;
      margin-bottom: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #171717;
    }
    p {
      margin: 0 0 16px 0;
      color: #525252;
    }
    .button {
      display: inline-block;
      background: #0066FF;
      color: white !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background: #0052CC;
    }
    .secondary-text {
      font-size: 14px;
      color: #737373;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      font-size: 14px;
      color: #737373;
    }
    .highlight {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">${APP_NAME}</div>
    ${content}
    <div class="footer">
      <p>${escapeHtml(t("footer", { appName: APP_NAME }))}</p>
    </div>
  </div>
</body>
</html>
`;
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
