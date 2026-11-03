# Climate Scoring & Action Plans — Implementation Report

**Date**: 2026-11-03 (overnight run)
**Branch**: `claude/project-progress-check-7bae00` (local commits, not pushed)
**Spec**: [climate-scoring-and-action-plans-spec.md](climate-scoring-and-action-plans-spec.md)

## Summary

The whole spec is implemented, with every open question answered by its default. Exceptions are listed under "Not done".

| Check | Result |
|-------|--------|
| Unit + integration tests (whole repo) | **1,511 passed**, 0 failed (was 1,421; 90 new). The climate-specific suites alone are 125. |
| Real-database end-to-end test | **18 / 18 steps passed**, run 3 times in a row, with clean teardown |
| Browser walkthrough (admin → leader → task owner) | Passed: 10 screenshots, no console or server errors |
| `tsc --noEmit` | Clean (only the 4 pre-existing errors in old test files) |
| `next build` (production) | Passed; 5 new routes compiled |
| ESLint on new files | Clean. Remaining warnings and 1 error are pre-existing, in files I touched but not in my code. |

Bugs that already existed and were fixed on the way are listed in §5.

## 1. What was built

### Scoring (spec §3)
- **Scale registry**: [climate-scales.ts](../src/lib/constants/climate-scales.ts) defines `FREQ_4` (Nunca…Siempre), `AGREE_5`, `NUMERIC_5` and `NPS_11`, stored per question in `config.scale`.
  - The portal renders each question on its own scale.
  - The builder has a scale picker for custom Likert questions.
- **Validated instrument**: [climate-instrument.ts](../src/lib/constants/climate-instrument.ts) holds the 12 dimensions × 60 items word for word, as version `KCO-2026.1`.
  - It's seeded as a system template that can be re-run safely ([seed-system-templates.ts](../prisma/seed-system-templates.ts)).
  - It reuses the existing "Liderazgo" and "Comunicación" dimensions instead of duplicating them.
- **Instrument guard** ([climate-instrument-guard.ts](../src/lib/utils/climate-instrument-guard.ts)), enforced on the server:
  - Locked items are reset to their official text, scale and dimension, whatever the client sends.
  - Dimensions must be applied whole.
  - Custom questions are kept out of instrument dimensions.
  - Inline edits of locked items are rejected, and the pencil is hidden in the Questions tab.
- **Scoring engine** ([climate-scoring.ts](../src/lib/utils/climate-scoring.ts)), pure functions:
  - Item mean, favorability and distribution.
  - Dimension mean and favorability, with equal weight per item.
  - The Índice de Clima, with equal weight per dimension.
  - The study's mean bands, cut at 3.55 / 3.05 / 2.55 with a floating-point guard.
  - Goal gaps, segment scoring with the minimum group size applied, and impact classification.
- **Results query**: [climate-reports.ts](../src/lib/queries/climate-reports.ts) is rebuilt on the engine.
  - NPS is never mixed with Likert.
  - The minimum group size (`anonymityThreshold`) now actually hides small groups; before, nothing read it.
  - Segments come from the snapshot taken at submission.
  - Adds a leader breakdown and "Puntos de atención".
- **Segment snapshot**: each response stores `{departmentId, hubId, teamIds, leaderEmployeeId}` when submitted ([climate-segments.ts](../src/lib/utils/climate-segments.ts)). Older responses fall back to the employee's current position.
- **Análisis tab**: Índice de Clima card, banded dimension bars, attention points, heatmaps by department, team, hub and leader with hidden small groups, and per-item answer distributions labelled with the scale.

### Action plans (spec §4)
- **Schema**: one migration [20261103060000_climate_scoring_and_action_plans](../prisma/migrations/20261103060000_climate_scoring_and_action_plans/migration.sql).
  - New tables: `ActionPlan`, `ActionPlanTask`, `ActionPlanMeasure`, `ActionPlanUpdate`, `ActionPlanEvidence`, `LeaderSurveyContext`.
  - New fields on `ClimateSurvey`: `goalBand`, `planMinPerLeader`, `planDueDate`, `resultsReleasedAt`, `followUpUserIds`, `instrumentVersion`, `planReminderSentAt`.
  - Also `SurveyResponse.segmentSnapshot`, `ClimateDimension.code`, plus the data step and the cascade fix in §5.
- **Server actions** ([action-plans.ts](../src/lib/actions/action-plans.ts)):
  - Plans: create (baseline frozen from the group's scores, default target one band up, automatic outcome indicator), update, submit, complete, cancel, delete.
  - Tasks, notes, progress indicators with value history, and evidence (private bucket, signed URLs).
  - Leader team context, release and hide results, and evaluate impact.
- **Who can do what** ([climate-actor.ts](../src/lib/auth/climate-actor.ts)):
  - Admins can do everything within their company.
  - Plan owners manage their own plans; task owners update their own tasks.
  - Actions called from `/portal` pages run as the portal employee, even if the browser also holds an admin session.
- **Read models and impact** ([queries/action-plans.ts](../src/lib/queries/action-plans.ts)): leader gaps and plan minimums, leader view, plan detail, my tasks and plans, admin overview, and impact evaluation. Closing an instrument survey evaluates earlier plans automatically.
- **Emails** ([climate-plan-emails.ts](../src/lib/email/climate-plan-emails.ts)): in Spanish or English by company locale, with portal magic links that open the right page. Sent on results released, plan submitted, task assigned, task due or overdue, plan deadline, leader completed, and impact evaluated.
- **Reminders**: [/api/cron/climate-plans](../src/app/api/cron/climate-plans/route.ts) sends a daily task digest (at most once a day per task) and a one-time deadline nudge to leaders.

### Screens
| Where | What |
|-------|------|
| Dashboard › survey › **Planes de acción** tab | Release or hide results, evaluate impact, leader compliance, impact summary, filterable plan list, "Nuevo plan" (organization, department, hub, team or leader) |
| Dashboard › survey › plan | Full plan editor (admin) |
| Dashboard › survey › Configuración | "Resultados y planes" card: goal, plans per leader, deadline, HR follow-up |
| Survey wizard / builder | Instrument dimensions locked (whole-dimension removal only); scale picker |
| Portal › `/portal/climate-results/[surveyId]` | Leader team results, gaps with "Crear plan", team context, items |
| Portal › `/portal/climate-plans/[planId]` | Plan editor (owner), or a view limited to their own task (task owner) |
| Portal › `/portal/my-tasks` | Assigned tasks: status, notes; plus own plans |
| Portal › home | "Clima laboral: resultados y planes" section |

## 2. Decisions taken (open questions → defaults)

| OQ | Default used |
|----|--------------|
| 1 Which bands | The study's **mean bands** only; sum bands and % zones dropped |
| 2 Favorability | Share answering **3–4** on the 4-point scale (4–5 on the legacy 5-point) |
| 3 Anchors | Nunca / Casi nunca / Casi siempre / Siempre |
| 4 Gaps between ranges | Round to 1 decimal, half up (cutoffs 3.55 / 3.05 / 2.55) |
| 5 Goal | A **band**, default Favorable, set per survey |
| 6 Minimum group size *k* | 5 (the existing per-survey setting) |
| 7 Plans per leader | Default 1 (configurable 0–12); counts only plans on gap dimensions; deadline defaults to release + 15 days |
| 8 Plan method / 48 actions | Structure as in the spec; the suggestions library is not built (no content yet) |
| 9 Anonymous vs confidential | **Not changed**: identity is still linked to responses, as before |
| 10 Leader access | **Portal magic links** (no seat needed) |
| 11 Item spelling | Left word for word |
| 12 Loading weights | Not used |
| 13 Members see plans | No |

**Changes from the spec, with reasons:**
- **Default Likert scale is 1–4, not 1–5.** The portal has shown LIKERT as Nunca…Siempre (1–4) since 2026-04-16, while every analytics view divided by 5 and labelled answers as agreement. The migration stamps each existing LIKERT question with the scale it was really answered on: 1–5 if any answer is above 4, otherwise 1–4.
- **The old `/surveys/climate/[id]/results` page now redirects** to the survey page. Nothing linked to it, and it duplicated the Análisis tab.

## 3. End-to-end test against a real database

**File**: [tests/e2e/climate-action-plans.e2e.test.ts](../tests/e2e/climate-action-plans.e2e.test.ts). Only sessions and email delivery are stubbed; every action, query and SQL statement is real.

```bash
E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/peerhub_climate npx vitest run tests/e2e
```

**Setup**: a fresh company with 3 leaders: Lina (6 reports), Marco (6) and Nora (2, below the minimum of 5). There's also a cross-department team (Equipo Norte, 5 people), an HR admin, and a second company for isolation checks.

| # | Step | Edge cases checked |
|---|------|--------------------|
| 1 | Create instrument survey | Partial dimension rejected ("missing LID-5"); custom question inside an instrument dimension rejected |
| 2 | Canonicalization | Tampered item text and `isRequired:false` reset to the official values; `instrumentVersion` set |
| 3 | Inline edits | Locked item blocked; custom question editable |
| 4 | Plan settings | Invalid goal band; follow-up user from another company rejected |
| 5 | Responses | Out-of-scale answer (5 on 1–4) rejected; second submit rejected; snapshot stored; then an employee is reorganized after submitting |
| 6 | Scoring | Exact means (44/14 → Favorable, 38/14 → Desfavorable), favorability, eNPS kept separate, the moved employee still counted under the original leader, Nora's team hidden, cross-department team scored, text answers visible above the minimum |
| 7 | Before release | Leader view hidden; leader can't plan; non-admin can't release |
| 8 | Release | 3 leaders, 2 emailed (the suppressed team isn't); deadline +15 days; second release rejected |
| 9 | Leader view | Gaps lowest first; plans required = min(minimum, gaps); non-leaders see nothing; the suppressed team sees no items |
| 10 | Leader creates a plan | Other leader's team and organization scope rejected; target below baseline rejected; start after end rejected; baseline 2.00 / Muy desfavorable / n=6; default target one band up |
| 11 | Submit | Requires a task; task owner from another company rejected; HR and task owner emailed; double submit and deleting a submitted plan rejected; compliance 1/1 vs 0/1; overdue task counted |
| 12 | Task owner | Updates own task status; can't cancel, edit the plan, add general notes, or touch others' tasks; a colleague can't touch the task either |
| 13 | Complete | Progress indicator values; NaN rejected; can't complete with open tasks or an empty note; HR emailed "completó sus planes"; closed plan rejects new tasks |
| 14 | Admin plans | Organization, department and team plans; unknown group rejected; suppressed leader group rejected; non-instrument dimension rejected; cancel requires a reason; hiding results blocked once plans are submitted |
| 15 | Tenant isolation | Another company's admin can't read, cancel or release |
| 16 | Evidence | Upload to a closed plan rejected; `.exe` rejected; files over 10 MB rejected; storage not configured gives a clean error |
| 17 | Reminders | Draft plans skipped; one digest per owner covering a task due soon and an overdue task; second run sends nothing; deadline nudge only to the leader below the minimum, only once |
| 18 | Follow-up survey | Closing survey B evaluates plans from survey A. Lina's plan: 2.00 → 3.60 (Muy favorable), **Mejoró**, owner emailed. Organization plan: **Mejoró**. Team plan: **Sin cambio de nivel**. Cancelled and draft plans not evaluated. Re-running gives the same result. |

### Other automated tests added
- **Scoring engine (40+ cases)**:
  - Every band cutoff, including 71/20 = 3.55 stored as 3.5499…
  - Favorability on each scale, and NPS kept out of everything.
  - Mixed scales give no overall mean; scales never mix inside a dimension; dimensions weighted equally.
  - Out-of-range values ignored; empty and text-only surveys.
  - Small-group suppression, including a group of exactly *k*.
  - Multi-team segments, gaps, impact classification.
- **Scales and instrument**: default and legacy scales, anchors, scale position, 60 unique item codes.
- **Instrument guard**: 9 cases.
- **Plan helpers**: progress, overdue checked in both **Bogotá and UTC** (a task due today is never overdue), and impact.
- **Identity resolution**: portal referer, admin preference, inactive employee, manager, super admin.
- **Response actions**: other company's distribution, foreign question, values out of range or non-integer, and the snapshot stored.
- **Results query**: rewritten (19 cases): suppression of the whole survey, segments and text; snapshot preferred over live data; names; scoring within a scope.

## 4. Browser walkthrough (local dev, real UI)

The data comes from the demo seed (`npx tsx scripts/seed-climate-demo.ts`). Screenshots are in [climate-implementation-report/](climate-implementation-report/).

1. **Admin, Análisis tab** ([01](climate-implementation-report/01-analisis-indice.jpg)):
   - Índice 2.99 Desfavorable, 79% favorable, 12 banded dimensions.
   - Attention points list 6 dimensions plus the Ingeniería department and leader Sara.
   - Heatmaps hide "Diseño (3)" and "Ana Ruiz (2)".
   - Items show Nunca…Siempre distributions.
2. **Admin releases results** ([02](climate-implementation-report/02-release-results.jpg)): toast "3 líderes, 2 con brechas recibieron un correo"; deadline 18 Nov.
3. **Sara opens the link from her email** (taken from the server log) and lands on her team's results ([03](climate-implementation-report/03-leader-results.jpg)): 6 responses, minimum-2-plans banner.
4. **Sara creates a plan** from the "Salud mental" gap ([04](climate-implementation-report/04-create-plan-dialog.jpg)): baseline 2.37 Muy desfavorable is pre-filled.
   - She adds a task for Santiago and submits ([05](climate-implementation-report/05-plan-submitted.jpg)).
   - The database confirms the plan is attributed to Sara, not the admin whose session was also in the browser.
5. **Emails logged**: HR gets "Nuevo plan de acción"; Santiago gets "Nueva tarea asignada".
6. **Santiago opens his link** to "Mis tareas" ([06](climate-implementation-report/06-task-owner-my-tasks.jpg)) and sets the task to "En progreso" with a note. On the plan page he only sees controls for his own task.
7. **Admin compliance view** ([07](climate-implementation-report/07-admin-compliance.jpg)): Sara 1/2, Miguel 0/2, Ana "menos de 5 respuestas"; impact "pendiente 1".
8. **Admin creates an organization plan** for Gestión de cambio ([08](climate-implementation-report/08-admin-org-plan.jpg)): baseline 2.63, 16 responses.
9. **New survey from the instrument template** ([09](climate-implementation-report/09-wizard-locked-instrument.jpg)): dimensions locked. Saving the draft stored 60/60 locked items with `KCO-2026.1`.
10. **Portal home** ([10](climate-implementation-report/10-portal-home.jpg)): climate section shows "1 tarea abierta".
11. `GET /api/cron/climate-plans` → `{"success":true,…}`.

## 5. Pre-existing bugs found and fixed

1. **The Likert scale didn't match between the portal and analytics.** The portal collected 1–4 frequency answers, but analytics divided by 5 and labelled them as agreement. Every LIKERT percentage, colour and label was wrong.
2. **The overall average mixed NPS (0–10) with Likert.** The Análisis tab also divided every Likert bar by 10 as soon as one NPS question existed.
3. **Heatmap colours ignored the scale's minimum**, so a 1 on a 1–5 scale showed as 20%.
4. **The `anonymityThreshold` setting was never applied** to any climate breakdown.
5. **Response submission didn't validate enough.** It never checked that the distribution belongs to the respondent's company, that the question belongs to the survey, or that the value is on the scale.
6. **The wizard dropped question `config`**, so instrument metadata couldn't survive creating a survey.
7. **Deleting a survey or company with answers failed**: `SurveyAnswer → SurveyQuestion` had no cascade.
8. **`prisma/seed.ts` crashed** on the required `Company.taxId`.

**Noticed but not fixed:** the older system climate templates refer to English dimension names ("Leadership") while the default dimensions are Spanish. Their questions are seeded with no dimension.

## 6. Not done / needs you

- **Demographic segments** (gender, generation, tenure) aren't built: `Employee` has no gender or birth date yet (spec P3).
- **Suggested-actions library (48 actions)**: the `suggestedActionCode` field exists, but there's no content and no picker (OQ-8).
- **Evidence storage wasn't tested against real Supabase.** I removed the service keys from this worktree on purpose.
  - Before using evidence: create a **private** bucket `climate-evidence`, or set `CLIMATE_EVIDENCE_BUCKET`.
  - Until then the UI says "File storage isn't configured".
- **Cron isn't scheduled.** There's no `vercel.json` in the repo; the existing `send-reminders` cron isn't scheduled there either. Schedule `GET /api/cron/climate-plans` daily with `Authorization: Bearer $CRON_SECRET`.
- **Anonymity model (OQ-9) unchanged.** Identity is still linked to answers, and the existing Answers tab still lists individual responses.
- **Known limitation from the spec:** a hidden group can be worked out by subtracting its visible siblings from the parent group.
- **The leader portal shows only instrument items**, not the survey's custom questions.

## 7. Deploy checklist

1. Review the migration. It stamps each existing LIKERT question with its scale, changes one foreign key to cascade, and adds the new tables and columns. Back up the database first.
2. Deploy. The build already runs `prisma migrate deploy`.
3. Seed the instrument once per environment: `npx tsx prisma/seed-system-templates.ts` (safe to re-run).
4. Create the private storage bucket and schedule the cron (§6).
5. Optionally set each survey's goal, plans per leader and HR follow-up under Configuración.

## 8. Try it locally

```bash
docker compose up -d postgres            # db on :5433
npx prisma migrate deploy && npx prisma db seed
npx tsx scripts/seed-climate-demo.ts     # prints the admin login URL
PORT=4999 npm run dev
```

- Sign in as admin through the printed `/api/dev/token` link.
- Release results from the "Planes de acción" tab.
- In dev mode, leader and task-owner magic links are printed in the server log (`EMAIL_DEV_MODE=true`).

> This worktree used its own scratch database `peerhub_climate` on the local Postgres and its own `node_modules`. Your `peerhub` database, the main checkout and production weren't touched.

---

## Addendum — 2026-11-03 (second round)

**Review fixes** (CodeRabbit on PR #38), commits `e3decdb` and `c68cc8a`:
- **"Today" uses a business time zone** (`NEXT_PUBLIC_BUSINESS_TIME_ZONE`, default `America/Bogota`): overdue tasks, reminders and default deadlines no longer depend on the server's time zone.
- **Releasing results is atomic**, so it can't release or email twice.
- **Follow-up emails** go only to active company members.
- **Impact emails** are sent only when a result is new or changed.
- **Plan foreign keys are `NO ACTION`**, so deleting a company cascades through its plans.
- **The portal home** skips surveys the employee doesn't lead before loading any scores.

**New in this round:**
- **Demographic segments.** `Employee.gender` and `Employee.birthDate` come in a new migration, `20261103150000_employee_demographics`.
  - They can be captured in the People forms and in CSV import.
  - Responses snapshot gender, generation and tenure.
  - The Análisis tab adds heatmaps by gender, generation and tenure, with small groups hidden, and includes those groups in "Puntos de atención". ([11](climate-implementation-report/11-demographic-heatmaps.jpg), [13](climate-implementation-report/13-people-demographics.jpg))
- **Fixed: editing and deactivating people always failed.** The People edit page passed an Employee id to actions that expect a CompanyUser id. New `updateEmployee` and `deactivateEmployee` actions take the Employee id.
- **Scheduled reminders.** `vercel.json` runs `/api/cron/climate-plans` daily at 13:00 UTC. It needs `CRON_SECRET` set in Vercel.
- **Demo tooling:**
  - `scripts/seed-climate-demo.ts` adds demographics and a closed 2025 survey with three leader plans.
  - `scripts/demo-links.ts` prints sign-in links.
  - Both refuse to run against non-local databases.
  - Closing the 2026 survey shows the impact: 2 improved, 1 worsened ([12](climate-implementation-report/12-impact-evaluated.jpg)).
  - Walkthrough: [climate-demo-guide.md](climate-demo-guide.md).

**Tests:**
- Unit and integration: 1,560 pass (+46 since the first round).
- Real-database e2e: 20/20.
- `next build` passes.
