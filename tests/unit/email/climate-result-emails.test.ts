/**
 * The client's results emails ("Modelos de correo"): every field filled in,
 * optional blocks only when they apply, and nothing sent with an empty field.
 */
import { describe, it, expect } from "vitest";
import {
  MissingEmailFieldError,
  adminClosingEmail,
  dayAndMonth,
  leaderResultsEmail,
  longDay,
  planCopyEmail,
  planReminderEmail,
} from "@/lib/email/climate-result-emails";

const link = "https://app.kultiva.com.co/portal/verify/tok?redirect=%2Fportal%2Fclimate-results%2Fs1";

const leader = {
  leaderFirstName: "Lina",
  surveyName: "Clima 2026",
  company: "Acme",
  link,
  threshold: 5,
  signature: "Equipo Kultiva",
};

describe("dates", () => {
  it("writes calendar days and moments the way the emails say them", () => {
    expect(longDay(new Date("2026-12-15T00:00:00Z"))).toBe("15 de diciembre de 2026");
    expect(longDay(new Date("2026-12-15T00:00:00Z"), "en")).toBe("December 15, 2026");
    // 02:00 UTC on the 11th is still the 10th in Bogotá
    expect(dayAndMonth(new Date("2026-12-11T02:00:00Z"), "America/Bogota")).toBe("10 de diciembre");
  });
});

describe("Modelo 1 · leader results", () => {
  it("fills every field, with the plans block when plans are asked for", () => {
    const email = leaderResultsEmail({
      ...leader,
      plans: { minimum: 2, dueDate: "15 de diciembre de 2026", responsible: "Ana Gómez" },
    });
    expect(email.subject).toBe("Ya puedes ver los resultados de tu equipo y registrar tu plan de acción — Clima 2026");
    expect(email.text).toContain("Hola Lina:");
    expect(email.text).toContain("La encuesta Clima 2026 de Acme ya cerró");
    expect(email.text).toContain("menos de 5 respuestas");
    expect(email.text).toContain("mínimo 2 planes de acción para tu equipo, a más tardar el 15 de diciembre de 2026");
    expect(email.text).toContain("recibirás una copia por correo y Ana Gómez será notificado");
    expect(email.text).toContain("Equipo Kultiva · Kultiva SAS");
    expect(email.html).toContain("Ver mis resultados");
    // The button's link is repeated as text for clients that block buttons
    expect(email.html.split(link.replace(/&/g, "&amp;")).length).toBeGreaterThanOrEqual(3);
  });

  it("leaves out the plans block, and who's notified, when they don't apply", () => {
    const noPlans = leaderResultsEmail(leader);
    expect(noPlans.subject).toBe("Ya puedes ver los resultados de tu equipo — Clima 2026");
    expect(noPlans.text).not.toContain("Qué sigue");

    const nobodyFollowsUp = leaderResultsEmail({ ...leader, plans: { minimum: 1, dueDate: "15 de diciembre de 2026" } });
    expect(nobodyFollowsUp.text).toContain("mínimo 1 plan de acción");
    expect(nobodyFollowsUp.text).toContain("recibirás una copia por correo.");
    expect(nobodyFollowsUp.text).not.toContain("será notificado");
  });

  it("refuses to build an email with an empty field", () => {
    expect(() => leaderResultsEmail({ ...leader, leaderFirstName: " " })).toThrow(MissingEmailFieldError);
    expect(() => leaderResultsEmail({ ...leader, plans: { minimum: 1, dueDate: "" } })).toThrow(
      expect.objectContaining({ field: "fecha_limite_planes" }),
    );
  });

  it("escapes names in the HTML", () => {
    const email = leaderResultsEmail({ ...leader, company: "<b>Acme</b>" });
    expect(email.html).not.toContain("<b>Acme</b>");
    expect(email.html).toContain("&lt;b&gt;Acme&lt;/b&gt;");
  });

  it("has an English version", () => {
    const email = leaderResultsEmail(leader, "en");
    expect(email.subject).toBe("You can now see your team's results — Clima 2026");
    expect(email.html).toContain("See my results");
  });

  it("tells the leader the survey closed, since it only goes out after the close", () => {
    expect(leaderResultsEmail(leader).text).toMatch(/^La encuesta Clima 2026 de Acme ya cerró/m);
    expect(leaderResultsEmail(leader, "en").text).toMatch(/^The Clima 2026 survey at Acme has closed/m);
  });
});

describe("Modelo 2 · plan reminder", () => {
  it("names the deadline and the minimum", () => {
    const email = planReminderEmail({
      leaderFirstName: "Lina",
      surveyName: "Clima 2026",
      dueDate: "15 de diciembre de 2026",
      minimum: 1,
      link,
      signature: "Equipo Kultiva",
    });
    expect(email.subject).toBe("Recordatorio: tu plan de acción de Clima 2026 vence el 15 de diciembre de 2026");
    expect(email.text).toContain("se pide mínimo 1 plan.");
    expect(email.html).toContain("Ir a mi plan de acción");
  });
});

describe("Modelo 3 · closing report to admins", () => {
  const admin = {
    adminFirstName: "Carlos",
    surveyName: "Clima 2026",
    company: "Acme",
    responded: 45,
    invited: 60,
    participationPct: 75,
    reportLink: "https://app.kultiva.com.co/climate-report/shared/abc",
    leadersSentOn: "10 de diciembre",
    threshold: 5,
    signature: "Equipo Kultiva",
    plans: { minimum: 2, dueDate: "15 de diciembre de 2026", followUpEmails: "rrhh@acme.com" },
  };

  it("reports participation, the general report, leaders and follow-up", () => {
    const email = adminClosingEmail(admin);
    expect(email.subject).toBe("Encuesta Clima 2026 cerrada: informe general y seguimiento");
    expect(email.text).toContain("45 de 60 personas respondieron (75 %).");
    expect(email.text).toContain("El 10 de diciembre cada líder recibió su enlace personal");
    expect(email.text).toContain("mínimo 2 planes de acción antes del 15 de diciembre de 2026");
    expect(email.text).toContain("Recibirás un correo en rrhh@acme.com");
    expect(email.html).toContain("Ver informe general");
  });

  it("says so when no leader got a link, and skips follow-up nobody does", () => {
    const email = adminClosingEmail({ ...admin, leadersSentOn: null, plans: { minimum: 2, dueDate: "15 de diciembre de 2026" } });
    expect(email.text).toContain("Ningún equipo alcanzó el mínimo de respuestas");
    expect(email.text).not.toContain("mínimo 2 planes");
    expect(email.text).not.toContain("Seguimiento de planes");
  });
});

describe("plan copy to the leader", () => {
  it("repeats the plan and who was notified", () => {
    const email = planCopyEmail({
      leaderFirstName: "Lina",
      surveyName: "Clima 2026",
      dimension: "Calidad de vida",
      action: "Pausas activas",
      startDate: "5 de noviembre de 2026",
      endDate: "15 de diciembre de 2026",
      link,
      signature: "Equipo Kultiva",
      responsible: "Ana Gómez",
    });
    expect(email.subject).toBe("Copia de tu plan de acción — Clima 2026");
    expect(email.text).toContain("Dimensión: Calidad de vida");
    expect(email.text).toContain("Acción: Pausas activas");
    expect(email.text).toContain("Ana Gómez recibió el aviso del plan nuevo.");
  });
});
