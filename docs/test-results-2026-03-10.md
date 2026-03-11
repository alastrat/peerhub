# Test Results — 2026-03-10

> Scope: Section 1 (Evaluacion 360 / Feedback) completion + Competency Management feature
> PR: https://github.com/alastrat/peerhub/pull/2
> Branch: `feat/competency-management`

---

## Automated Tests (Vitest)

**170 tests passing** — all green

### Unit Tests (113)

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/unit/validations/user.test.ts` | 18 | Pass |
| `tests/unit/utils/formatting.test.ts` | 27 | Pass |
| `tests/unit/utils/dates.test.ts` | 15 | Pass |
| `tests/unit/constants/roles.test.ts` | 6 | Pass |
| `tests/unit/permissions/abilities.test.ts` | 47 | Pass |

### Integration Tests (57)

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/integration/actions/reviews.test.ts` | 18 | Pass |
| `tests/integration/actions/nominations.test.ts` | 18 | Pass |
| `tests/integration/actions/portal.test.ts` | 9 | Pass |
| `tests/integration/actions/departments.test.ts` | 8 | Pass |
| `tests/integration/actions/notify-employee.test.ts` | 4 | Pass |

---

## Browser Tests (Playwright)

Manual browser automation via Playwright MCP against `localhost:4999`.
Authenticated as `alastrat@pluriza.com` (Admin, Pluriza company).

### Page Load Tests

| Page | URL | Status | Notes |
|------|-----|--------|-------|
| Overview | `/overview` | Pass | Dashboard with stats cards, quick actions, "Welcome back, Andres" |
| People | `/people` | Pass | Employee list with Add/Import buttons, empty state |
| Templates | `/templates` | Pass | Template list with Create button, empty state |
| Template Builder | `/templates/new` | Pass | Section/question builder loads correctly |
| Cycles | `/cycles` | Pass | Cycle list with Create button, empty state |
| Reports | `/reports` | Pass | Reports page with "View Cycles" link, empty state |
| My Feedback | `/my-feedback` | Pass | Employee feedback view, empty state |
| Settings | `/settings` | Pass | Full nav: Profile, General, Members, Roles, Departments, Competencies |
| Settings > Departments | `/settings/company/departments` | Pass | Department manager with Create button |
| Settings > Competencies | `/settings/company/competencies` | Pass | Shows competencies grouped by category |

### Competency CRUD Tests

| Action | Status | Details |
|--------|--------|---------|
| Create competency #1 | Pass | "Strategic Thinking" — category: Leadership, description provided |
| Create competency #2 | Pass | "Teamwork" — category: Organizational, description provided |
| Display grouping | Pass | Competencies grouped under "Organizational" and "Leadership" headings |
| Category badges | Pass | Each competency card shows category badge |
| Edit/Delete menu | Pass | Three-dot menu visible on each competency card |

### Template Builder — Competency Integration

| Action | Status | Details |
|--------|--------|---------|
| Open question type dropdown | Pass | Shows: Rating Scale, Open Text, Competency Rating, Multiple Choice |
| Select "Competency Rating" | Pass | Competency dropdown field appears below type selector |
| Open competency dropdown | Pass | Shows: "No competency linked", "Strategic Thinking (leadership)", "Teamwork (organizational)" |
| Help text | Pass | "Link this question to a competency for aggregated reporting" visible |

### Settings Navigation

| Item | Status |
|------|--------|
| Profile link | Pass |
| General link | Pass |
| Members link | Pass |
| Roles link | Pass |
| Departments link | Pass |
| Competencies link (new) | Pass — Target icon, links to `/settings/company/competencies` |

---

## Not Testable (No Data)

The following features require a full cycle with submitted reviews to verify visually:

- **CompetencyScores component** — Renders in `/reports/[cycleId]/[userId]` and `/my-feedback/[cycleId]` but requires feedback data
- **Competency aggregation in reports** — Score calculation, per-reviewer-type breakdown, self-vs-others gap
- **Anonymity threshold enforcement** on competency scores
- **Report release/unrelease** with competency data

Code review confirmed these components are correctly integrated and the aggregation logic is sound.

---

## Build Verification

| Check | Status |
|-------|--------|
| `npx vitest run` | 170/170 pass |
| `next build` (local) | Pass |
| Vercel deployment | Fixed — added `prisma generate` to build script, excluded `prisma/seed.ts` from tsconfig |
| TypeScript compilation | Clean — no errors |

---

## Files Changed (97 files, +6504 / -840 lines)

### New Files (Competency Feature)
- `src/lib/actions/competencies.ts` — Server actions (create, update, delete)
- `src/components/settings/competencies-manager.tsx` — Catalog management UI
- `src/app/(dashboard)/settings/company/competencies/page.tsx` — Settings page
- `src/components/reports/competency-scores.tsx` — Report display component

### Modified Files (Competency Integration)
- `src/components/templates/template-builder.tsx` — Competency dropdown for COMPETENCY_RATING
- `src/lib/actions/templates.ts` — competencyId in create/update/duplicate
- `src/app/(dashboard)/templates/new/page.tsx` — Fetches competencies
- `src/app/(dashboard)/templates/[id]/edit/page.tsx` — Fetches competencies
- `src/app/(dashboard)/templates/[id]/page.tsx` — Shows competency name
- `src/lib/queries/reports.ts` — Competency aggregation logic
- `src/types/index.ts` — CompetencyScore interface
- `src/app/(dashboard)/reports/[cycleId]/[userId]/page.tsx` — CompetencyScores component
- `src/app/(dashboard)/my-feedback/[cycleId]/page.tsx` — CompetencyScores component
- `src/components/settings/settings-nav.tsx` — Competencies nav link

### New Files (Infrastructure)
- `src/app/(portal)/` — Employee portal (6 files)
- `src/lib/actions/portal.ts`, `src/lib/actions/portal-reviews.ts` — Portal actions
- `src/lib/auth/portal-session.ts` — Portal auth
- `src/lib/email/portal-templates.ts` — Email templates
- `src/lib/utils/notify-employee.ts` — Dual notification routing
- `tests/` — 10 test files, 2 helpers, 1 setup file
- `vitest.config.ts` — Test configuration
- `docs/roadmap-progress.md` — Updated roadmap
