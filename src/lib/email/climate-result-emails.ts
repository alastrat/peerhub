// The client's results emails ("Modelos de correo para la entrega de
// resultados"): 1 · results to each leader, 2 · plan reminder, 3 · closing
// report to the company admins, plus the copy a leader gets of a saved plan.
// Pure builders: callers look up the data and send.

import { baseTemplate, emailButton, emailCallout, escapeHtml } from "./portal-templates";
import { SUPPORT_EMAIL } from "./email-constants";

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/** A field the email needs is empty: the client's rule is that such an email doesn't go out. */
export class MissingEmailFieldError extends Error {
  constructor(public readonly field: string) {
    super(`Email field "${field}" is empty`);
    this.name = "MissingEmailFieldError";
  }
}

function requireFields(fields: Record<string, string | number | null | undefined>) {
  for (const [field, value] of Object.entries(fields)) {
    if (value == null || (typeof value === "string" && value.trim() === "")) throw new MissingEmailFieldError(field);
  }
}

const isEs = (locale?: string | null) => locale !== "en";
const h = escapeHtml;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** "15 de diciembre de 2026" for a calendar day stored at UTC midnight. */
export function longDay(date: Date, locale?: string | null): string {
  return date.toLocaleDateString(isEs(locale) ? "es-CO" : "en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "10 de diciembre" for a moment, in the business time zone. */
export function dayAndMonth(date: Date, timeZone: string, locale?: string | null): string {
  return date.toLocaleDateString(isEs(locale) ? "es-CO" : "en-US", { day: "numeric", month: "long", timeZone });
}

function signOff(closing: string, signature: string) {
  return {
    html: `<p style="margin:0;">${h(closing)}<br>${h(signature)} · Kultiva SAS</p>`,
    text: `${closing}\n${signature} · Kultiva SAS`,
  };
}

// ---------------------------------------------------------------------------
// Modelo 1 · Resultados disponibles para el líder
// ---------------------------------------------------------------------------

export interface LeaderResultsFields {
  leaderFirstName: string;
  surveyName: string;
  company: string;
  link: string;
  threshold: number;
  signature: string;
  /** The green block, when the survey asks leaders for action plans. `responsible` is who follows up, if anyone. */
  plans?: { minimum: number; dueDate: string; responsible?: string | null } | null;
}

export function leaderResultsEmail(f: LeaderResultsFields, locale?: string | null): BuiltEmail {
  requireFields({
    nombre_lider: f.leaderFirstName,
    nombre_encuesta: f.surveyName,
    empresa: f.company,
    enlace_personal_lider: f.link,
    umbral_anonimato: f.threshold,
    firma_nombre: f.signature,
    ...(f.plans ? { minimo_planes: f.plans.minimum, fecha_limite_planes: f.plans.dueDate } : {}),
  });
  const p = f.plans;

  if (isEs(locale)) {
    const subject = p
      ? `Ya puedes ver los resultados de tu equipo y registrar tu plan de acción — ${f.surveyName}`
      : `Ya puedes ver los resultados de tu equipo — ${f.surveyName}`;
    const intro = `La encuesta ${f.surveyName} de ${f.company} ya cerró y queremos agradecerte por haber motivado la participación de tu equipo. Tus resultados ya están disponibles en este enlace:`;
    const where = "Ahí encontrarás los resultados de tu equipo por dimensión y por pregunta.";
    const keep = [
      "El enlace es personal y solo muestra los resultados de tu equipo, nunca los del resto de la organización. Guárdalo para volver a entrar cuando quieras y no lo reenvíes.",
      `Para proteger el anonimato, los grupos con menos de ${f.threshold} respuestas no se muestran de forma desglosada.`,
    ];
    const plansText = p
      ? `Qué sigue: además de revisar los resultados, te pedimos registrar mínimo ${p.minimum} ${plural(p.minimum, "plan", "planes")} de acción para tu equipo, a más tardar el ${p.dueDate}. En el mismo enlace, entra a la sección de plan de acción, elige la dimensión que quieres trabajar y escribe la acción y sus fechas. Al guardar, recibirás una copia por correo${p.responsible ? ` y ${p.responsible} será notificado` : ""}.`
      : null;
    const suggest = "Te sugerimos revisar los resultados con calma y conversar con tu equipo sobre lo que encuentres.";
    const help = `Si tienes alguna dificultad para ingresar, escríbenos a ${SUPPORT_EMAIL}.`;
    const sign = signOff("Un saludo,", f.signature);

    const html = baseTemplate(
      `<p>Hola ${h(f.leaderFirstName)}:</p>
<p>${h(intro)}</p>
${emailButton(f.link, "Ver mis resultados", locale)}
<p>${h(where)}</p>
<p style="margin-bottom:8px;">Ten en cuenta:</p>
<ul>${keep.map((k) => `<li>${h(k)}</li>`).join("")}</ul>
${p ? emailCallout(`<strong>Qué sigue:</strong> ${h(plansText!.replace(/^Qué sigue: /, ""))}`) : ""}
<p>${h(suggest)}</p>
<p>${h(help)}</p>
${sign.html}`,
      locale,
    );
    const text = [
      `Hola ${f.leaderFirstName}:`,
      intro,
      `Ver mis resultados: ${f.link}`,
      where,
      `Ten en cuenta:\n${keep.map((k) => `- ${k}`).join("\n")}`,
      plansText,
      suggest,
      help,
      sign.text,
    ]
      .filter(Boolean)
      .join("\n\n");
    return { subject, html, text };
  }

  const subject = p
    ? `You can now see your team's results and record your action plan — ${f.surveyName}`
    : `You can now see your team's results — ${f.surveyName}`;
  const intro = `The ${f.surveyName} survey at ${f.company} has closed, and we'd like to thank you for encouraging your team to take part. Your results are ready at this link:`;
  const where = "There you'll find your team's results by dimension and by question.";
  const keep = [
    "The link is personal and only shows your team's results, never the rest of the organization's. Keep it to come back whenever you want, and don't forward it.",
    `To protect anonymity, groups with fewer than ${f.threshold} responses aren't shown separately.`,
  ];
  const plansText = p
    ? `Please also record at least ${p.minimum} action ${plural(p.minimum, "plan", "plans")} for your team by ${p.dueDate}. At the same link, open the action plan section, pick the dimension you want to work on and write the action and its dates. When you save, you'll get a copy by email${p.responsible ? ` and ${p.responsible} will be notified` : ""}.`
    : null;
  const suggest = "Take your time with the results and talk them through with your team.";
  const help = `If you have trouble getting in, write to us at ${SUPPORT_EMAIL}.`;
  const sign = signOff("Best regards,", f.signature);
  const html = baseTemplate(
    `<p>Hi ${h(f.leaderFirstName)},</p>
<p>${h(intro)}</p>
${emailButton(f.link, "See my results", locale)}
<p>${h(where)}</p>
<p style="margin-bottom:8px;">Keep in mind:</p>
<ul>${keep.map((k) => `<li>${h(k)}</li>`).join("")}</ul>
${plansText ? emailCallout(`<strong>What's next:</strong> ${h(plansText)}`) : ""}
<p>${h(suggest)}</p>
<p>${h(help)}</p>
${sign.html}`,
    locale,
  );
  const text = [
    `Hi ${f.leaderFirstName},`,
    intro,
    `See my results: ${f.link}`,
    where,
    `Keep in mind:\n${keep.map((k) => `- ${k}`).join("\n")}`,
    plansText ? `What's next: ${plansText}` : null,
    suggest,
    help,
    sign.text,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Modelo 2 · Recordatorio del plan de acción
// ---------------------------------------------------------------------------

export interface PlanReminderFields {
  leaderFirstName: string;
  surveyName: string;
  dueDate: string;
  minimum: number;
  link: string;
  signature: string;
}

export function planReminderEmail(f: PlanReminderFields, locale?: string | null): BuiltEmail {
  requireFields({
    nombre_lider: f.leaderFirstName,
    nombre_encuesta: f.surveyName,
    fecha_limite_planes: f.dueDate,
    minimo_planes: f.minimum,
    enlace_personal_lider: f.link,
    firma_nombre: f.signature,
  });

  if (isEs(locale)) {
    const subject = `Recordatorio: tu plan de acción de ${f.surveyName} vence el ${f.dueDate}`;
    const p1 = `Te recordamos que aún no registras tu plan de acción para ${f.surveyName}. La fecha límite es el ${f.dueDate} y se pide mínimo ${f.minimum} ${plural(f.minimum, "plan", "planes")}.`;
    const p2 = "Puedes hacerlo en pocos minutos entrando con tu enlace personal:";
    const p3 = `Elige una dimensión donde veas oportunidad de mejora, escribe la acción y las fechas, y guarda. Si necesitas ayuda, escríbenos a ${SUPPORT_EMAIL}.`;
    const sign = signOff("Gracias,", f.signature);
    const html = baseTemplate(
      `<p>Hola ${h(f.leaderFirstName)}:</p>
<p>${h(p1)}</p>
<p>${h(p2)}</p>
${emailButton(f.link, "Ir a mi plan de acción", locale)}
<p>${h(p3)}</p>
${sign.html}`,
      locale,
    );
    return { subject, html, text: [`Hola ${f.leaderFirstName}:`, p1, p2, `Ir a mi plan de acción: ${f.link}`, p3, sign.text].join("\n\n") };
  }

  const subject = `Reminder: your ${f.surveyName} action plan is due ${f.dueDate}`;
  const p1 = `This is a reminder that you haven't recorded your action plan for ${f.surveyName} yet. The deadline is ${f.dueDate} and at least ${f.minimum} ${plural(f.minimum, "plan is", "plans are")} expected.`;
  const p2 = "It only takes a few minutes with your personal link:";
  const p3 = `Pick a dimension where you see room to improve, write the action and its dates, and save. If you need help, write to us at ${SUPPORT_EMAIL}.`;
  const sign = signOff("Thank you,", f.signature);
  const html = baseTemplate(
    `<p>Hi ${h(f.leaderFirstName)},</p>
<p>${h(p1)}</p>
<p>${h(p2)}</p>
${emailButton(f.link, "Go to my action plan", locale)}
<p>${h(p3)}</p>
${sign.html}`,
    locale,
  );
  return { subject, html, text: [`Hi ${f.leaderFirstName},`, p1, p2, `Go to my action plan: ${f.link}`, p3, sign.text].join("\n\n") };
}

// ---------------------------------------------------------------------------
// Modelo 3 · Administrador del cliente
// ---------------------------------------------------------------------------

export interface AdminClosingFields {
  adminFirstName: string;
  surveyName: string;
  company: string;
  responded: number;
  invited: number;
  /** Already rounded, e.g. 75. */
  participationPct: number;
  reportLink: string;
  /** Day the leaders got their links; null when no leader had enough responses for a report. */
  leadersSentOn: string | null;
  threshold: number;
  signature: string;
  /** When the survey asks for plans. `followUpEmails` lists who gets plan notices, if anyone. */
  plans?: { minimum: number; dueDate: string; followUpEmails?: string | null } | null;
}

export function adminClosingEmail(f: AdminClosingFields, locale?: string | null): BuiltEmail {
  requireFields({
    nombre_admin: f.adminFirstName,
    nombre_encuesta: f.surveyName,
    empresa: f.company,
    participacion_n: f.responded,
    total_invitados: f.invited,
    participacion_pct: f.participationPct,
    enlace_informe_general: f.reportLink,
    umbral_anonimato: f.threshold,
    firma_nombre: f.signature,
    ...(f.plans ? { minimo_planes: f.plans.minimum, fecha_limite_planes: f.plans.dueDate } : {}),
  });
  const p = f.plans;

  if (isEs(locale)) {
    const subject = `Encuesta ${f.surveyName} cerrada: informe general y seguimiento`;
    const intro = `La encuesta ${f.surveyName} de ${f.company} ya cerró. Te compartimos lo necesario para hacerle seguimiento.`;
    const participation = `${f.responded} de ${f.invited} personas respondieron (${f.participationPct} %).`;
    const shareNote = "El enlace da acceso a los resultados de todas las áreas. Compártelo solo con la gerencia y con quienes ella designe.";
    const leaders = f.leadersSentOn
      ? `El ${f.leadersSentOn} cada líder recibió su enlace personal, con el resultado solo de su equipo.`
      : "Ningún equipo alcanzó el mínimo de respuestas, así que no se enviaron enlaces a líderes.";
    const plansBlock = p ? `Les pedimos registrar mínimo ${p.minimum} ${plural(p.minimum, "plan", "planes")} de acción antes del ${p.dueDate}.` : null;
    const followUp = p?.followUpEmails
      ? `Recibirás un correo en ${p.followUpEmails} cada vez que un líder registre un plan nuevo. Desde el informe general puedes ver el avance.`
      : null;
    const privacy = `Los grupos con menos de ${f.threshold} respuestas no se muestran de forma desglosada, para proteger el anonimato.`;
    const doubts = `Quedamos atentos a cualquier duda: ${SUPPORT_EMAIL}.`;
    const sign = signOff("Un saludo,", f.signature);
    const html = baseTemplate(
      `<p>Hola ${h(f.adminFirstName)}:</p>
<p>${h(intro)}</p>
<p><strong>Participación:</strong> ${h(participation)}</p>
<p><strong>Informe general.</strong> Para ver los resultados completos, entra a este enlace:</p>
${emailButton(f.reportLink, "Ver informe general", locale)}
<p>${h(shareNote)}</p>
<p><strong>Líderes.</strong> ${h(leaders)}</p>
${plansBlock && f.leadersSentOn ? emailCallout(h(plansBlock)) : ""}
${followUp ? `<p><strong>Seguimiento de planes.</strong> ${h(followUp)}</p>` : ""}
<p><strong>Confidencialidad.</strong> ${h(privacy)}</p>
<p>${h(doubts)}</p>
${sign.html}`,
      locale,
    );
    const text = [
      `Hola ${f.adminFirstName}:`,
      intro,
      `Participación: ${participation}`,
      `Informe general. Para ver los resultados completos, entra a este enlace: ${f.reportLink}`,
      shareNote,
      `Líderes. ${leaders}${plansBlock && f.leadersSentOn ? ` ${plansBlock}` : ""}`,
      followUp ? `Seguimiento de planes. ${followUp}` : null,
      `Confidencialidad. ${privacy}`,
      doubts,
      sign.text,
    ]
      .filter(Boolean)
      .join("\n\n");
    return { subject, html, text };
  }

  const subject = `${f.surveyName} survey closed: general report and follow-up`;
  const intro = `The ${f.surveyName} survey at ${f.company} has closed. Here's what you need to follow it up.`;
  const participation = `${f.responded} of ${f.invited} people responded (${f.participationPct}%).`;
  const shareNote = "The link opens the results of every area. Share it only with management and the people they choose.";
  const leaders = f.leadersSentOn
    ? `On ${f.leadersSentOn} each leader got their personal link, showing only their team's results.`
    : "No team reached the minimum number of responses, so no leader links were sent.";
  const plansBlock = p ? `We asked them to record at least ${p.minimum} action ${plural(p.minimum, "plan", "plans")} by ${p.dueDate}.` : null;
  const followUp = p?.followUpEmails
    ? `You'll get an email at ${p.followUpEmails} each time a leader records a new plan. The general report shows the progress.`
    : null;
  const privacy = `Groups with fewer than ${f.threshold} responses aren't shown separately, to protect anonymity.`;
  const doubts = `We're here for any questions: ${SUPPORT_EMAIL}.`;
  const sign = signOff("Best regards,", f.signature);
  const html = baseTemplate(
    `<p>Hi ${h(f.adminFirstName)},</p>
<p>${h(intro)}</p>
<p><strong>Participation:</strong> ${h(participation)}</p>
<p><strong>General report.</strong> To see the full results, open this link:</p>
${emailButton(f.reportLink, "See the general report", locale)}
<p>${h(shareNote)}</p>
<p><strong>Leaders.</strong> ${h(leaders)}</p>
${plansBlock && f.leadersSentOn ? emailCallout(h(plansBlock)) : ""}
${followUp ? `<p><strong>Plan follow-up.</strong> ${h(followUp)}</p>` : ""}
<p><strong>Confidentiality.</strong> ${h(privacy)}</p>
<p>${h(doubts)}</p>
${sign.html}`,
    locale,
  );
  const text = [
    `Hi ${f.adminFirstName},`,
    intro,
    `Participation: ${participation}`,
    `General report: ${f.reportLink}`,
    shareNote,
    `Leaders. ${leaders}${plansBlock && f.leadersSentOn ? ` ${plansBlock}` : ""}`,
    followUp ? `Plan follow-up. ${followUp}` : null,
    `Confidentiality. ${privacy}`,
    doubts,
    sign.text,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Copy of a saved plan, to its leader ("copia al líder")
// ---------------------------------------------------------------------------

export interface PlanCopyFields {
  leaderFirstName: string;
  surveyName: string;
  dimension: string;
  action: string;
  startDate: string;
  endDate: string;
  link: string;
  signature: string;
  /** Who got the notice; omitted when nobody follows up this survey. */
  responsible?: string | null;
}

export function planCopyEmail(f: PlanCopyFields, locale?: string | null): BuiltEmail {
  requireFields({
    nombre_lider: f.leaderFirstName,
    nombre_encuesta: f.surveyName,
    dimension: f.dimension,
    accion: f.action,
    fecha_inicio: f.startDate,
    fecha_fin: f.endDate,
    enlace_personal_lider: f.link,
    firma_nombre: f.signature,
  });
  const es = isEs(locale);
  const subject = es ? `Copia de tu plan de acción — ${f.surveyName}` : `Copy of your action plan — ${f.surveyName}`;
  const intro = es
    ? `Registraste este plan de acción para tu equipo en ${f.surveyName}:`
    : `You recorded this action plan for your team in ${f.surveyName}:`;
  const rows: [string, string][] = es
    ? [["Dimensión", f.dimension], ["Acción", f.action], ["Fechas", `${f.startDate} → ${f.endDate}`]]
    : [["Dimension", f.dimension], ["Action", f.action], ["Dates", `${f.startDate} → ${f.endDate}`]];
  const notified = f.responsible
    ? es
      ? `${f.responsible} recibió el aviso del plan nuevo.`
      : `${f.responsible} was notified of the new plan.`
    : null;
  const next = es
    ? "Con tu enlace personal puedes revisarlo, actualizar su estado o agregar evidencia:"
    : "With your personal link you can review it, update its status or add evidence:";
  const sign = signOff(es ? "Un saludo," : "Best regards,", f.signature);
  const html = baseTemplate(
    `<p>${es ? "Hola" : "Hi"} ${h(f.leaderFirstName)}${es ? ":" : ","}</p>
<p>${h(intro)}</p>
${emailCallout(rows.map(([k, v]) => `<strong>${h(k)}:</strong> ${h(v)}`).join("<br>"))}
${notified ? `<p>${h(notified)}</p>` : ""}
<p>${h(next)}</p>
${emailButton(f.link, es ? "Ir a mi plan de acción" : "Go to my action plan", locale)}
${sign.html}`,
    locale,
  );
  const text = [
    `${es ? "Hola" : "Hi"} ${f.leaderFirstName}${es ? ":" : ","}`,
    intro,
    rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
    notified,
    `${next} ${f.link}`,
    sign.text,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject, html, text };
}
