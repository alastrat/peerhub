import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, role, employees, modules, message } = body;

    if (!name || !email || !company || !role || !employees) {
      return NextResponse.json(
        { error: "missing_required_fields" },
        { status: 400 }
      );
    }

    const subject = `Solicitud de demo: ${company}`;
    const modulesList = Array.isArray(modules) ? modules.join(", ") : "—";

    const html = `
      <h2>Nueva solicitud de demo</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Empresa:</strong> ${company}</p>
      <p><strong>Cargo:</strong> ${role}</p>
      <p><strong>Tamaño:</strong> ${employees}</p>
      <p><strong>Módulos de interés:</strong> ${modulesList}</p>
      ${message ? `<p><strong>Mensaje:</strong><br/>${message}</p>` : ""}
    `;
    const text = `Nueva solicitud de demo
Nombre: ${name}
Email: ${email}
Empresa: ${company}
Cargo: ${role}
Tamaño: ${employees}
Módulos: ${modulesList}
${message ? `Mensaje: ${message}` : ""}`;

    const recipient =
      process.env.DEMO_REQUEST_TO ||
      process.env.EMAIL_FROM ||
      "noreply@kultiva.com";

    const result = await sendEmail({
      to: recipient,
      subject,
      html,
      text,
    });

    if (!result.success) {
      console.error("Demo request email failed:", result.error);
      return NextResponse.json(
        { error: "email_send_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Demo request error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
