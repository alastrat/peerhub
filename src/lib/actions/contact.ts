"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email/resend";
import type { ActionResult } from "@/types";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
});

export type ContactFormInput = z.infer<typeof contactSchema>;

const RECIPIENT =
  process.env.CONTACT_FORM_RECIPIENT || "comercial@kultiva.com.co";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function submitContactForm(
  input: ContactFormInput
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "invalid_input" };
  }

  const { name, email, phone, message } = parsed.data;

  const subject = `Nuevo mensaje desde el formulario de contacto — ${name}`;

  const text = [
    `Nombre: ${name}`,
    `Email: ${email}`,
    phone ? `Teléfono: ${phone}` : null,
    "",
    "Mensaje:",
    message || "(sin mensaje)",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <h2 style="color: #613171;">Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      ${phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ""}
      <p><strong>Mensaje:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(message || "(sin mensaje)")}</p>
    </div>
  `;

  const result = await sendEmail({
    to: RECIPIENT,
    subject,
    html,
    text,
  });

  if (!result.success) {
    return { success: false, error: "send_failed" };
  }

  return { success: true };
}
