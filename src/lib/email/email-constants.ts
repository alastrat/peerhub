// Sender details shared by the platform's emails (client's "Reglas generales de envío").

/** Where replies and support questions go. */
export const SUPPORT_EMAIL = process.env.EMAIL_REPLY_TO || "comercial@kultiva.com.co";

/** Sender name for survey, results and action-plan emails. */
export const SURVEY_SENDER_NAME = process.env.EMAIL_SURVEY_SENDER_NAME || "Kultiva Encuestas";

/** Contact line at the bottom of every email. */
export const COMPANY_FOOTER = `Kultiva SAS · ${SUPPORT_EMAIL} · www.kultiva.com.co`;

/** Fallback signature when no super admin has set one. */
export const DEFAULT_EMAIL_SIGNATURE = "Equipo Kultiva";

/** PlatformSetting key for the name that signs the results emails ({firma_nombre}). */
export const EMAIL_SIGNATURE_SETTING_KEY = "email_signature";

/** Brand colors used inline (email clients ignore most CSS). */
export const EMAIL_COLORS = {
  brand: "#613171",
  leaf: "#8cc63f",
  ink: "#1f1a24",
  muted: "#6b6472",
  line: "#ebe6ee",
  page: "#f4f1f6",
  calloutBg: "#f1f7e8",
  calloutBorder: "#c9e2a8",
} as const;
