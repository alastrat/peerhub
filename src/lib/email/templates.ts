// 360° review emails. Every email takes the company's locale (es by default).

import { sendEmail } from "./resend";
import { baseTemplate, emailButton, escapeHtml } from "./portal-templates";
import { getTranslator, type Translator } from "@/i18n/translator";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kultiva";

type Locale = string | null | undefined;

/** Plain-text version of a message that wraps part of its text in <strong>. */
function plain(t: Translator, key: string, values: Record<string, string | number>) {
  return t.markup(key, { ...values, strong: (chunks) => chunks });
}

/** HTML version: values are escaped, <strong> is kept. */
function rich(t: Translator, key: string, values: Record<string, string | number>) {
  const escaped = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? escapeHtml(v) : v]),
  );
  return t.markup(key, { ...escaped, strong: (chunks) => `<strong>${chunks}</strong>` });
}

function greeting(t: Translator, name: string | null | undefined) {
  return name ? t("greeting", { name }) : t("greeting_no_name");
}

function dueDateBlock(t: Translator, dueDate: string) {
  return `<div class="highlight">
      <p style="margin: 0;"><strong>${escapeHtml(t("due_label"))}</strong> ${escapeHtml(dueDate)}</p>
    </div>`;
}

export async function sendInvitationEmail(params: {
  to: string;
  inviterName?: string | null;
  companyName?: string | null;
  inviteUrl: string;
  locale?: Locale;
  /** Re-send of a pending invitation: the subject says so. */
  reminder?: boolean;
}) {
  const t = getTranslator(params.locale, "emails");
  const values = {
    inviter: params.inviterName || t("invitation.fallback_inviter"),
    company: params.companyName || t("invitation.fallback_company"),
    appName: APP_NAME,
  };
  const cta = t("invitation.cta");

  const html = baseTemplate(`
    <h1>${escapeHtml(t("invitation.heading", values))}</h1>
    <p>${escapeHtml(t("invitation.body", values))}</p>
    ${emailButton(params.inviteUrl, cta, params.locale)}
    <p class="secondary-text">${escapeHtml(t("invitation.expiry"))}</p>
  `, params.locale);

  return sendEmail({
    to: params.to,
    subject: t(params.reminder ? "invitation.reminder_subject" : "invitation.subject", values),
    html,
    text: `${t("invitation.body", values)} ${cta}: ${params.inviteUrl}`,
  });
}

export async function sendReviewRequestEmail(params: {
  to: string;
  reviewerName?: string | null;
  /** null for a self-review */
  revieweeName: string | null;
  cycleName: string;
  dueDate: string;
  reviewUrl: string;
  locale?: Locale;
}) {
  const t = getTranslator(params.locale, "emails");
  const self = params.revieweeName === null;
  const values = { reviewee: params.revieweeName ?? "", cycle: params.cycleName };
  const key = (name: string) => `review_request.${name}${self ? "_self" : ""}`;
  const cta = t("review_request.cta");

  const html = baseTemplate(`
    <h1>${escapeHtml(t(key("heading"), values))}</h1>
    <p>${escapeHtml(greeting(t, params.reviewerName))}</p>
    <p>${rich(t, key("body"), values)}</p>
    ${dueDateBlock(t, params.dueDate)}
    <a href="${params.reviewUrl}" class="button">${escapeHtml(cta)}</a>
    <p class="secondary-text">${escapeHtml(t(key("note"), values))}</p>
  `, params.locale);

  return sendEmail({
    to: params.to,
    subject: t(key("subject"), values),
    html,
    text: `${plain(t, key("body"), values)} ${t("due_label")} ${params.dueDate}. ${cta}: ${params.reviewUrl}`,
  });
}

export async function sendExternalReviewRequestEmail(params: {
  to: string;
  reviewerName?: string | null;
  revieweeName: string;
  companyName: string;
  cycleName: string;
  dueDate: string;
  reviewUrl: string;
  locale?: Locale;
}) {
  const t = getTranslator(params.locale, "emails");
  const values = { company: params.companyName, reviewee: params.revieweeName, cycle: params.cycleName };
  const cta = t("external_review_request.cta");

  const html = baseTemplate(`
    <h1>${escapeHtml(t("external_review_request.heading", values))}</h1>
    <p>${escapeHtml(greeting(t, params.reviewerName))}</p>
    <p>${rich(t, "external_review_request.body", values)}</p>
    ${dueDateBlock(t, params.dueDate)}
    <a href="${params.reviewUrl}" class="button">${escapeHtml(cta)}</a>
    <p class="secondary-text">${escapeHtml(t("external_review_request.note"))}</p>
  `, params.locale);

  return sendEmail({
    to: params.to,
    subject: t("external_review_request.subject", values),
    html,
    text: `${plain(t, "external_review_request.body", values)} ${t("due_label")} ${params.dueDate}. ${cta}: ${params.reviewUrl}`,
  });
}

export async function sendReminderEmail(params: {
  to: string;
  reviewerName?: string | null;
  pendingCount: number;
  dueDate: string;
  dashboardUrl: string;
  locale?: Locale;
}) {
  const t = getTranslator(params.locale, "emails");
  const values = { count: params.pendingCount };
  const cta = t("reminder.cta");

  const html = baseTemplate(`
    <h1>${escapeHtml(t("reminder.heading", values))}</h1>
    <p>${escapeHtml(greeting(t, params.reviewerName))}</p>
    <p>${rich(t, "reminder.body", values)}</p>
    ${dueDateBlock(t, params.dueDate)}
    <a href="${params.dashboardUrl}" class="button">${escapeHtml(cta)}</a>
    <p class="secondary-text">${escapeHtml(t("reminder.note"))}</p>
  `, params.locale);

  return sendEmail({
    to: params.to,
    subject: t("reminder.subject", values),
    html,
    text: `${plain(t, "reminder.body", values)} ${t("due_label")} ${params.dueDate}. ${cta}: ${params.dashboardUrl}`,
  });
}

export async function sendReportReleasedEmail(params: {
  to: string;
  employeeName?: string | null;
  cycleName: string;
  reportUrl: string;
  locale?: Locale;
}) {
  const t = getTranslator(params.locale, "emails");
  const values = { cycle: params.cycleName };
  const cta = t("report_released.cta");

  const html = baseTemplate(`
    <h1>${escapeHtml(t("report_released.heading"))}</h1>
    <p>${escapeHtml(greeting(t, params.employeeName))}</p>
    <p>${escapeHtml(t("report_released.body", values))}</p>
    <a href="${params.reportUrl}" class="button">${escapeHtml(cta)}</a>
    <p class="secondary-text">${escapeHtml(t("report_released.note"))}</p>
  `, params.locale);

  return sendEmail({
    to: params.to,
    subject: t("report_released.subject", values),
    html,
    text: `${t("report_released.body", values)} ${cta}: ${params.reportUrl}`,
  });
}

export async function sendNominationRequestEmail(params: {
  to: string;
  employeeName?: string | null;
  cycleName: string;
  minPeers: number;
  maxPeers: number;
  dueDate: string;
  nominationUrl: string;
  locale?: Locale;
}) {
  const t = getTranslator(params.locale, "emails");
  const values = { cycle: params.cycleName, min: params.minPeers, max: params.maxPeers };
  const cta = t("nomination_request.cta");

  const html = baseTemplate(`
    <h1>${escapeHtml(t("nomination_request.heading"))}</h1>
    <p>${escapeHtml(greeting(t, params.employeeName))}</p>
    <p>${escapeHtml(t("nomination_request.body", values))}</p>
    <div class="highlight">
      <p style="margin: 0 0 8px 0;"><strong>${escapeHtml(t("nomination_request.required_label"))}</strong> ${escapeHtml(t("nomination_request.required_value", values))}</p>
      <p style="margin: 0;"><strong>${escapeHtml(t("due_label"))}</strong> ${escapeHtml(params.dueDate)}</p>
    </div>
    <a href="${params.nominationUrl}" class="button">${escapeHtml(cta)}</a>
    <p class="secondary-text">${escapeHtml(t("nomination_request.note"))}</p>
  `, params.locale);

  return sendEmail({
    to: params.to,
    subject: t("nomination_request.subject", values),
    html,
    text: `${t("nomination_request.body", values)} ${t("nomination_request.required_value", values)}. ${t("due_label")} ${params.dueDate}. ${cta}: ${params.nominationUrl}`,
  });
}
