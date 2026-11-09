/**
 * Survey detail page: an anonymous survey's page data (the props sent to the
 * browser) carries nothing that ties a response to a person.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidElement, type ReactNode } from "react";
import type { Session } from "next-auth";
import { createMockPrisma, type MockPrismaClient } from "../../helpers/mock-prisma";
import { createAdminSession } from "../../helpers/mock-session";

let mockPrisma: MockPrismaClient;
let mockSession: Session | null;

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));

vi.mock("@/lib/auth/config", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@/lib/queries/climate-reports", () => ({
  getSurveyResults: vi.fn(async () => ({ participation: { leaders: [], gender: [], generation: [], tenure: [] } })),
}));

vi.mock("@/lib/queries/action-plans", () => ({ getSurveyPlansOverview: vi.fn(async () => null) }));

// Client components: only their props matter here
vi.mock("@/components/climate/distribute-dialog", () => ({ DistributeDialog: () => null }));
vi.mock("@/components/climate/survey-detail-actions", () => ({ SurveyDetailActions: () => null }));
vi.mock("@/components/climate/survey-answers-tab", () => ({ SurveyAnswersTab: () => null }));
vi.mock("@/components/climate/survey-participants-tab", () => ({ SurveyParticipantsTab: () => null }));
vi.mock("@/components/climate/survey-questions-tab", () => ({ SurveyQuestionsTab: () => null }));
vi.mock("@/components/climate/survey-settings-tab", () => ({ SurveySettingsTab: () => null }));
vi.mock("@/components/climate/survey-insights-tab", () => ({ SurveyInsightsTab: () => null }));
vi.mock("@/components/climate/plans/survey-plans-tab", () => ({ SurveyPlansTab: () => null }));
vi.mock("@/components/climate/plans/plan-settings-card", () => ({ PlanSettingsCard: () => null }));
vi.mock("@/components/climate/report/report-cover-card", () => ({ ReportCoverCard: () => null }));
vi.mock("@/components/climate/report/report-link-button", () => ({ ReportLinkButton: () => null }));

// Import AFTER mocks
import SurveyDetailPage from "@/app/(dashboard)/surveys/climate/[id]/page";
import { SurveyAnswersTab } from "@/components/climate/survey-answers-tab";
import { SurveyParticipantsTab } from "@/components/climate/survey-participants-tab";

const IDENTITY = ["Ana Ruiz", "ana@acme.com", "emp-ana", "Analista", "Engineering", "Main Office", "Laura Leader", "lead-1"];

function response(overrides: Record<string, unknown> = {}) {
  return {
    id: "resp-1",
    employeeId: "emp-ana",
    isComplete: true,
    submittedAt: new Date("2026-11-02T10:00:00Z"),
    createdAt: new Date("2026-11-02T09:50:00Z"),
    updatedAt: new Date("2026-11-02T10:00:00Z"),
    segmentSnapshot: { departmentId: "dept-1", hubId: "hub-1", teamIds: [], leaderEmployeeId: "lead-1" },
    employee: {
      id: "emp-ana",
      name: "Ana Ruiz",
      email: "ana@acme.com",
      title: "Analista",
      managerId: "lead-1",
      department: { name: "Engineering" },
      hub: { name: "Main Office" },
    },
    answers: [{ questionId: "q1", ratingValue: 4, textValue: null, createdAt: new Date(), updatedAt: new Date() }],
    _count: { answers: 1 },
    ...overrides,
  };
}

function survey(isAnonymous: boolean) {
  return {
    id: "survey-1",
    companyId: "company-1",
    name: "Clima 2026",
    description: null,
    type: "CLIMATE",
    status: "ACTIVE",
    frequency: "ONCE",
    isAnonymous,
    anonymityThreshold: 5,
    questionsPerPage: 5,
    logoUrl: null,
    accessStartDate: null,
    accessEndDate: null,
    instrumentVersion: null,
    goalBand: "FAVORABLE",
    company: { logo: null },
    questions: [
      {
        id: "q1",
        text: "Me siento valorado",
        type: "LIKERT",
        order: 1,
        isRequired: true,
        dimensionId: null,
        dimension: null,
        config: { scale: "AGREE_5" },
      },
    ],
    distributions: [
      {
        id: "dist-1",
        sentAt: new Date("2026-11-01"),
        dueDate: new Date("2026-11-15"),
        targetType: "ALL",
        _count: { responses: 2 },
        responses: [
          response(),
          response({
            id: "resp-2",
            isComplete: false,
            submittedAt: null,
            employeeId: "emp-ana",
            answers: [],
            _count: { answers: 0 },
          }),
        ],
      },
    ],
  };
}

/** Everything the page hands to its components, as the browser would get it. */
function pageData(tree: ReactNode): string {
  return JSON.stringify(tree, (_key, value) =>
    isValidElement(value) ? { props: value.props } : typeof value === "function" ? undefined : value,
  );
}

/** The props given to one component somewhere in the tree. */
function propsOf(tree: ReactNode, component: unknown): Record<string, unknown> | null {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = propsOf(child, component);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(tree)) return null;
  const props = tree.props as Record<string, unknown>;
  if (tree.type === component) return props;
  for (const value of Object.values(props)) {
    const found = propsOf(value as ReactNode, component);
    if (found) return found;
  }
  return null;
}

async function renderPage(isAnonymous: boolean) {
  mockPrisma.climateSurvey.findFirst.mockResolvedValue(survey(isAnonymous));
  return (await SurveyDetailPage({ params: Promise.resolve({ id: "survey-1" }) })) as ReactNode;
}

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockSession = createAdminSession();
  mockPrisma.climateDimension.findMany.mockResolvedValue([]);
  mockPrisma.company.findUnique.mockResolvedValue({ featureHubs: true });
  mockPrisma.companyUser.findMany.mockResolvedValue([]);
  mockPrisma.employee.findMany.mockResolvedValue([{ id: "lead-1", name: "Laura Leader" }]);
});

describe("survey detail page data", () => {
  it("sends who answered on a named survey", async () => {
    const data = pageData(await renderPage(false));
    for (const value of ["Ana Ruiz", "ana@acme.com", "Main Office", "Laura Leader"]) {
      expect(data).toContain(value);
    }
  });

  it("carries no names, emails, employee ids, leader or sede on an anonymous survey", async () => {
    const tree = await renderPage(true);
    const data = pageData(tree);
    for (const value of IDENTITY) expect(data).not.toContain(value);
    // no lookup of leader names either
    expect(mockPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it("still sends the answers, statuses and counts on an anonymous survey", async () => {
    const tree = await renderPage(true);
    const answers = propsOf(tree, SurveyAnswersTab)!;
    expect(answers).toMatchObject({ totalCount: 2, completedCount: 1, pendingCount: 1, isAnonymous: true });
    const rows = answers.responses as { id: string; isComplete: boolean; answers: { ratingValue: number | null }[] }[];
    expect(rows.map((r) => [r.id, r.isComplete, r.answers.map((a) => a.ratingValue)])).toEqual([
      ["resp-1", true, [4]],
      ["resp-2", false, []],
    ]);
    expect(propsOf(tree, SurveyParticipantsTab)).toMatchObject({ isAnonymous: true, responses: rows });
  });
});
