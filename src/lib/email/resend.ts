import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "Kultiva <noreply@kultiva.com>";
const IS_DEV_MODE = process.env.EMAIL_DEV_MODE === "true";

/**
 * Raised when an email could not be delivered by the provider.
 * Callers can catch this specifically to distinguish email-delivery
 * failures from other errors (DB, validation, etc.).
 */
export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    public readonly recipients: string[],
    public readonly providerError?: unknown,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
}

/**
 * Sends an email via Resend. Throws {@link EmailDeliveryError} on provider
 * failure. In dev mode (EMAIL_DEV_MODE=true or no RESEND_API_KEY), logs the
 * email body to the server console and returns a fake message id.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<SendEmailResult> {
  const recipients = Array.isArray(to) ? to : [to];

  if (IS_DEV_MODE || !resend) {
    console.log("\n========================================");
    console.log("📧 EMAIL (Dev Mode)");
    console.log("========================================");
    console.log(`To: ${recipients.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log("----------------------------------------");
    console.log(text || html.replace(/<[^>]*>/g, ""));
    console.log("========================================\n");
    return { messageId: `dev-${Date.now()}` };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[email] Resend returned error:", {
        recipients,
        subject,
        error,
      });
      const msg = error.message?.includes("domain is not verified")
        ? `Email sender domain is not verified in Resend. Verify ${FROM_EMAIL.match(/@([^>]+)/)?.[1] || "your domain"} at https://resend.com/domains or use onboarding@resend.dev for testing.`
        : error.message || "Resend rejected the email";
      throw new EmailDeliveryError(msg, recipients, error);
    }

    if (!data?.id) {
      throw new EmailDeliveryError(
        "Resend returned no message id",
        recipients,
      );
    }

    return { messageId: data.id };
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    console.error("[email] Unexpected email send failure:", {
      recipients,
      subject,
      error,
    });
    throw new EmailDeliveryError(
      error instanceof Error ? error.message : "Failed to send email",
      recipients,
      error,
    );
  }
}

/**
 * Send many emails, returning per-recipient success/failure without throwing.
 * Use this for fan-out scenarios (e.g. notifying N reviewers) where one
 * bad recipient shouldn't fail the whole batch.
 */
export async function sendBulkEmails(
  emails: SendEmailOptions[],
): Promise<{
  successCount: number;
  failureCount: number;
  results: { to: string; success: boolean; error?: string }[];
}> {
  const results = await Promise.all(
    emails.map(async (email) => {
      const primaryTo = Array.isArray(email.to) ? email.to[0] : email.to;
      try {
        await sendEmail(email);
        return { to: primaryTo, success: true as const };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { to: primaryTo, success: false as const, error: message };
      }
    }),
  );

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return { successCount, failureCount, results };
}
