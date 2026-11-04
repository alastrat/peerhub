import type { Session } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import {
  normalizeSearchQuery,
  SEARCH_RESULTS_PER_TYPE,
  type SearchResult,
} from "@/lib/search/types";

type Contains = { contains: string; mode: "insensitive" };

const take = SEARCH_RESULTS_PER_TYPE;

function joinParts(...parts: (string | null | undefined)[]): string | null {
  const text = parts.filter(Boolean).join(" · ");
  return text || null;
}

async function searchPeople(companyId: string, match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [{ name: match }, { email: match }, { title: match }],
    },
    select: { id: true, name: true, email: true, title: true },
    orderBy: { name: "asc" },
    take,
  });
  return rows.map((row) => ({
    type: "person",
    id: row.id,
    title: row.name,
    subtitle: joinParts(row.title, row.email),
    href: `/people/${row.id}`,
  }));
}

async function searchClimateSurveys(companyId: string, match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.climateSurvey.findMany({
    where: { companyId, status: { not: "ARCHIVED" }, name: match },
    select: { id: true, name: true, description: true },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return rows.map((row) => ({
    type: "climateSurvey",
    id: row.id,
    title: row.name,
    subtitle: row.description,
    href: `/surveys/climate/${row.id}`,
  }));
}

async function searchActionPlans(companyId: string, match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.actionPlan.findMany({
    where: { companyId, title: match },
    select: { id: true, title: true, surveyId: true, survey: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return rows.map((row) => ({
    type: "actionPlan",
    id: row.id,
    title: row.title,
    subtitle: row.survey.name,
    href: `/surveys/climate/${row.surveyId}/plans/${row.id}`,
  }));
}

async function searchClimateTemplates(companyId: string, match: Contains): Promise<SearchResult[]> {
  // Same visibility as the templates list: the company's own templates plus
  // the global defaults every company can use.
  const rows = await prisma.climateSurveyTemplate.findMany({
    where: {
      name: match,
      OR: [
        { companyId, isArchived: false },
        { companyId: null, isDefault: true, isArchived: false },
      ],
    },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
    take,
  });
  return rows.map((row) => ({
    type: "climateTemplate",
    id: row.id,
    title: row.name,
    subtitle: row.description,
    href: `/surveys/climate/templates/${row.id}`,
  }));
}

async function searchCycles(companyId: string, match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.cycle.findMany({
    where: { companyId, status: { not: "ARCHIVED" }, name: match },
    select: { id: true, name: true, description: true },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return rows.map((row) => ({
    type: "cycle",
    id: row.id,
    title: row.name,
    subtitle: row.description,
    href: `/surveys/360/${row.id}`,
  }));
}

// Departments and teams have no detail page, so results land on their list.
async function searchDepartments(companyId: string, match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.department.findMany({
    where: { companyId, name: match },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
    take,
  });
  return rows.map((row) => ({
    type: "department",
    id: row.id,
    title: row.name,
    subtitle: row.description,
    href: "/settings/company/departments",
  }));
}

async function searchTeams(companyId: string, match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.team.findMany({
    where: { companyId, isActive: true, name: match },
    select: { id: true, name: true, department: { select: { name: true } } },
    orderBy: { name: "asc" },
    take,
  });
  return rows.map((row) => ({
    type: "team",
    id: row.id,
    title: row.name,
    subtitle: row.department?.name ?? null,
    href: "/settings/company/teams",
  }));
}

async function searchCompanies(match: Contains): Promise<SearchResult[]> {
  const rows = await prisma.company.findMany({
    where: { OR: [{ name: match }, { slug: match }, { domain: match }] },
    select: { id: true, name: true, slug: true, domain: true },
    orderBy: { name: "asc" },
    take,
  });
  return rows.map((row) => ({
    type: "company",
    id: row.id,
    title: row.name,
    subtitle: row.domain || row.slug,
    href: "/settings/platform/companies",
  }));
}

/**
 * Searches what the signed-in user can open from the dashboard.
 *
 * - Company entities are always scoped to `session.companyUser.companyId` and
 *   only searched for company ADMINs: every page they link to (people, climate
 *   surveys, action plans, templates, 360 cycles, departments, teams) redirects
 *   MANAGER and MEMBER users to /overview.
 * - Companies are only searched for SUPER_ADMINs.
 */
export async function globalSearch(
  session: Session | null,
  rawQuery: unknown,
): Promise<SearchResult[]> {
  if (!session?.user?.id) return [];

  const query = normalizeSearchQuery(rawQuery);
  if (!query) return [];

  const match: Contains = { contains: query, mode: "insensitive" };
  const searches: Promise<SearchResult[]>[] = [];

  const companyUser = session.companyUser;
  if (companyUser?.companyId && companyUser.role === "ADMIN") {
    const { companyId } = companyUser;
    searches.push(
      searchPeople(companyId, match),
      searchClimateSurveys(companyId, match),
      searchActionPlans(companyId, match),
      searchClimateTemplates(companyId, match),
      searchCycles(companyId, match),
      searchDepartments(companyId, match),
      searchTeams(companyId, match),
    );
  }

  if (session.user.globalRole === "SUPER_ADMIN") {
    searches.push(searchCompanies(match));
  }

  const groups = await Promise.all(searches);
  return groups.flat();
}
