/**
 * PlansTable: each plan title opens the plan in Planes de acción.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import type { PlanRow } from "@/lib/queries/action-plans";
import { PlansTable } from "@/components/climate/plans/plans-table";

const row = {
  id: "plan-1",
  title: "Pausas activas",
  surveyId: "survey-1",
  surveyName: "Clima 2026",
  scope: "LEADER",
  scopeName: "Sara",
  dimensionId: "dim-1",
  dimensionName: "Calidad de vida",
  ownerName: "Sara",
  status: "ACTIVE",
  baselineBand: "DESFAVORABLE",
  baselineMean: 2.4,
  targetBand: "FAVORABLE",
  endDate: new Date("2027-05-31"),
  progress: { done: 0, total: 3, pct: 0 },
  overdueTasks: 0,
  impact: null,
  resultMean: null,
} as unknown as PlanRow;

afterEach(cleanup);

describe("PlansTable", () => {
  it("links each plan to its page under Planes de acción", () => {
    render(
      <NextIntlClientProvider locale="es" messages={messages}>
        <PlansTable plans={[row]} dimensions={[]} emptyText="" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "Pausas activas" }).getAttribute("href")).toBe(
      "/action-plans/survey-1/plans/plan-1",
    );
  });
});
