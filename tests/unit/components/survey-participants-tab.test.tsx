/**
 * Avances tab: each person's leader, except on anonymous surveys, where row by
 * row it would tie a small team to the answers in Respuestas.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/climate-distribution", () => ({ distributeSurvey: vi.fn() }));

import { SurveyParticipantsTab, type ParticipantRow } from "@/components/climate/survey-participants-tab";

const row: ParticipantRow = {
  id: "resp-1",
  employeeName: "Ana Ruiz",
  employeeEmail: "ana@acme.com",
  employeeTitle: null,
  leaderName: "Laura Leader",
  hubName: null,
  isComplete: true,
  submittedAt: new Date("2026-11-01"),
  updatedAt: new Date("2026-11-01"),
  answeredCount: 3,
  totalQuestions: 3,
};

function renderTab(isAnonymous: boolean) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SurveyParticipantsTab
        surveyId="survey-1"
        surveyStatus="ACTIVE"
        responses={[isAnonymous ? { ...row, leaderName: null } : row]}
        employees={[]}
        hubs={[]}
        departments={[]}
        teams={[]}
        isAnonymous={isAnonymous}
        featureHubs={false}
        accessEndDate={null}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("SurveyParticipantsTab (Avances)", () => {
  it("shows each person's leader on a named survey", () => {
    renderTab(false);
    expect(screen.getByRole("button", { name: "Líder" })).toBeTruthy();
    expect(screen.getByText("Laura Leader")).toBeTruthy();
  });

  it("has no leader column on an anonymous survey", () => {
    renderTab(true);
    expect(screen.queryByRole("button", { name: "Líder" })).toBeNull();
    expect(screen.getByText("Anónimo")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });
});
