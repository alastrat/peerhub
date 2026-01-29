import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "Kultiva <noreply@kultiva.com>";
const IS_DEV_MODE = process.env.EMAIL_DEV_MODE === "true";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
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
    return { success: true, messageId: `dev-${Date.now()}` };
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
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendBulkEmails(
  emails: SendEmailOptions[]
): Promise<{ success: boolean; results: { to: string; success: boolean }[] }> {
  const results = await Promise.all(
    emails.map(async (email) => {
      const result = await sendEmail(email);
      return {
        to: Array.isArray(email.to) ? email.to[0] : email.to,
        success: result.success,
      };
    })
  );

  return {
    success: results.every((r) => r.success),
    results,
  };
}
