// Emails for the climate results / action-plan flow (spec §4.8).
// Employees (leaders, task owners) get portal magic links that land on the
// right page; follow-up users (HR) get a dashboard link.

import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "./resend";
import { baseTemplate, escapeHtml } from "./portal-templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface PlanEmailContent {
  subject: string;
  heading: string;
  /** Plain-text paragraphs; escaped before rendering. */
  paragraphs: string[];
  ctaLabel: string;
}

function render(content: PlanEmailContent, url: string, greetingName: string, locale: string) {
  const hello = locale === "en" ? `Hi ${greetingName},` : `Hola ${greetingName},`;
  const html = baseTemplate(`
    <h1>${escapeHtml(content.heading)}</h1>
    <p>${escapeHtml(hello)}</p>
    ${content.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
    <a href="${url}" class="button">${escapeHtml(content.ctaLabel)}</a>
  `, locale);
  const text = [hello, ...content.paragraphs, `${content.ctaLabel}: ${url}`].join("\n\n");
  return { html, text };
}

/** Email an employee a 24h portal magic link that lands on `redirectPath`. */
export async function emailEmployeeViaPortal(
  employeeId: string,
  redirectPath: string,
  build: (locale: string) => PlanEmailContent,
  cc?: string[],
): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true, email: true, companyId: true, isActive: true, company: { select: { locale: true } } },
  });
  if (!employee || !employee.isActive) return false;

  const token = randomUUID();
  await prisma.accessToken.create({
    data: {
      token,
      email: employee.email,
      companyId: employee.companyId,
      employeeId: employee.id,
      purpose: "EMPLOYEE_PORTAL",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const safePath = redirectPath.startsWith("/portal/") ? redirectPath : "/portal/home";
  const url = `${APP_URL}/portal/verify/${token}?redirect=${encodeURIComponent(safePath)}`;
  const locale = employee.company?.locale ?? "es";
  const content = build(locale);
  const { html, text } = render(content, url, employee.name, locale);
  await sendEmail({ to: employee.email, subject: content.subject, html, text, ...(cc?.length ? { cc } : {}) });
  return true;
}

/**
 * Email dashboard users (by User id) a link into the dashboard, plus any
 * extra addresses typed in by hand. Each address gets one email.
 */
export async function emailUsersViaDashboard(
  companyId: string,
  userIds: string[],
  path: string,
  build: (locale: string) => PlanEmailContent,
  extraEmails: string[] = [],
): Promise<number> {
  if (userIds.length === 0 && extraEmails.length === 0) return 0;
  const [users, company] = await Promise.all([
    // Only people who still belong to the company (follow-up lists can go stale)
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds }, companies: { some: { companyId, isActive: true } } },
          select: { email: true, name: true },
        })
      : Promise.resolve([]),
    prisma.company.findUnique({ where: { id: companyId }, select: { locale: true } }),
  ]);
  const locale = company?.locale ?? "es";
  const content = build(locale);

  const recipients = new Map<string, string>();
  for (const u of users) if (u.email) recipients.set(u.email.toLowerCase(), u.name ?? u.email);
  for (const email of extraEmails) {
    const key = email.trim().toLowerCase();
    if (key && !recipients.has(key)) recipients.set(key, key);
  }

  let sent = 0;
  for (const [email, name] of recipients) {
    const { html, text } = render(content, `${APP_URL}${path}`, name, locale);
    await sendEmail({ to: email, subject: content.subject, html, text });
    sent++;
  }
  return sent;
}

/** Fire-and-log: a failed email must never fail the user's action. */
export async function safely(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error(`[climate-plans] ${label} failed:`, error);
  }
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

const es = (locale: string) => locale !== "en";

export const planEmails = {
  resultsReleased: (surveyName: string, gapCount: number, dueDate: string | null) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: `Resultados de tu equipo — ${surveyName}`,
          heading: "Ya están los resultados de tu equipo",
          paragraphs: [
            `Los resultados de "${surveyName}" ya están disponibles. Tu equipo tiene ${gapCount} ${gapCount === 1 ? "dimensión" : "dimensiones"} por debajo de la meta.`,
            dueDate
              ? `Revisa las brechas y crea tus planes de acción antes del ${dueDate}.`
              : "Revisa las brechas y crea tus planes de acción.",
          ],
          ctaLabel: "Ver resultados y crear planes",
        }
      : {
          subject: `Your team's results — ${surveyName}`,
          heading: "Your team's results are ready",
          paragraphs: [
            `Results for "${surveyName}" are available. Your team has ${gapCount} ${gapCount === 1 ? "dimension" : "dimensions"} below the goal.`,
            dueDate ? `Review the gaps and create your action plans by ${dueDate}.` : "Review the gaps and create your action plans.",
          ],
          ctaLabel: "See results and create plans",
        },

  planSubmitted: (ownerName: string, planTitle: string, dimensionName: string, surveyName: string) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: `Nuevo plan de acción — ${surveyName}`,
          heading: "Se registró un plan de acción",
          paragraphs: [`${ownerName} envió el plan "${planTitle}" para la dimensión ${dimensionName} (${surveyName}).`],
          ctaLabel: "Ver planes de acción",
        }
      : {
          subject: `New action plan — ${surveyName}`,
          heading: "An action plan was submitted",
          paragraphs: [`${ownerName} submitted "${planTitle}" for ${dimensionName} (${surveyName}).`],
          ctaLabel: "See action plans",
        },

  taskAssigned: (taskTitle: string, planTitle: string, dueDate: string) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: `Nueva tarea asignada: ${taskTitle}`,
          heading: "Tienes una nueva tarea",
          paragraphs: [`Te asignaron "${taskTitle}" del plan "${planTitle}". Fecha límite: ${dueDate}.`],
          ctaLabel: "Ver mis tareas",
        }
      : {
          subject: `New task assigned: ${taskTitle}`,
          heading: "You have a new task",
          paragraphs: [`You were assigned "${taskTitle}" from the plan "${planTitle}". Due: ${dueDate}.`],
          ctaLabel: "See my tasks",
        },

  taskDue: (tasks: { title: string; dueDate: string; overdue: boolean }[]) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: "Tareas de planes de acción por vencer",
          heading: "Tienes tareas pendientes",
          paragraphs: tasks.map((t) => `${t.overdue ? "Vencida" : "Vence"} el ${t.dueDate}: ${t.title}`),
          ctaLabel: "Ver mis tareas",
        }
      : {
          subject: "Action-plan tasks due",
          heading: "You have pending tasks",
          paragraphs: tasks.map((t) => `${t.overdue ? "Overdue since" : "Due"} ${t.dueDate}: ${t.title}`),
          ctaLabel: "See my tasks",
        },

  planDeadline: (surveyName: string, dueDate: string, have: number, need: number) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: `Faltan planes de acción — ${surveyName}`,
          heading: "Se acerca la fecha límite de tus planes",
          paragraphs: [`Llevas ${have} de ${need} planes de acción para "${surveyName}". La fecha límite es el ${dueDate}.`],
          ctaLabel: "Crear planes de acción",
        }
      : {
          subject: `Action plans missing — ${surveyName}`,
          heading: "Your action-plan deadline is close",
          paragraphs: [`You have ${have} of ${need} action plans for "${surveyName}". The deadline is ${dueDate}.`],
          ctaLabel: "Create action plans",
        },

  leaderCompleted: (leaderName: string, surveyName: string, count: number) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: `${leaderName} completó sus planes de acción`,
          heading: "Planes de acción completados",
          paragraphs: [`${leaderName} completó sus ${count} ${count === 1 ? "plan" : "planes"} de acción de "${surveyName}".`],
          ctaLabel: "Ver planes de acción",
        }
      : {
          subject: `${leaderName} completed their action plans`,
          heading: "Action plans completed",
          paragraphs: [`${leaderName} completed their ${count} action ${count === 1 ? "plan" : "plans"} for "${surveyName}".`],
          ctaLabel: "See action plans",
        },

  impactEvaluated: (planTitle: string, surveyName: string, result: string) => (l: string): PlanEmailContent =>
    es(l)
      ? {
          subject: `Impacto del plan "${planTitle}"`,
          heading: "Se evaluó el impacto de tu plan",
          paragraphs: [`Con los resultados de "${surveyName}", el resultado de tu plan "${planTitle}" es: ${result}.`],
          ctaLabel: "Ver el plan",
        }
      : {
          subject: `Impact of "${planTitle}"`,
          heading: "Your plan's impact was evaluated",
          paragraphs: [`With the results of "${surveyName}", your plan "${planTitle}" is: ${result}.`],
          ctaLabel: "See the plan",
        },
};
