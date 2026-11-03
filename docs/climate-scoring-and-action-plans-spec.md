# Spec: Climate Survey Scoring & Action Plans

**Status**: Draft — pending answers to the open questions in §7
**Date**: 2026-11-03
**Module**: Clima Laboral (`/surveys/climate`, portal `/portal/climate-survey`)

## 1. Context

Kultiva commissioned a psychometric validation of its climate instrument (12 dimensions × 5 items, N = 212). The study fixes the response scale and how scores are interpreted. Separately, Kultiva built a POC (`Clients/Kultiva/deploy/index.html`) with leader reports and action plans. Neither matches what the platform does today.

This spec defines:

1. How the platform scores the validated instrument (scale, calculations, bands, goals).
2. The action-plan feature: plans, tasks, measures, follow-up and impact.
3. The fixes the current climate module needs first.

### Sources and precedence

| # | Source | Used for |
|---|--------|----------|
| S1 | *Análisis rápido de confiabilidad y AFE Kultiva.docx* and *Resultados propiedades psicométricas Clima Organizacional.pptx* (Dra. Regina M. Navarro, Aug 2026) | Instrument, scale type, interpretation bands. **Authoritative for scoring.** |
| S2 | Kultiva brochure, as summarised in [analisis-requerimientos-clima.md](analisis-requerimientos-clima.md) | Scale anchor labels, leader/management plan flows, HR completion email |
| S3 | [kultiva-features.md §4.7](kultiva-features.md) | Action-plan entities (plan → actions → progress → impact) |
| S4 | Kultiva POC (`deploy/index.html`) | Leader UX: gap cards, team context questions, plan minimums, notifications |

Where sources conflict on scoring, S1 wins. S1 says nothing about plans, so §4 combines S3's data model with S4's leader flow.

### Why the current scoring can't stay

On S1's own dataset, the four scoring rules in circulation give contradictory verdicts for the same company:

| Rule | Whole company (item mean 3.02, sum 181/240) |
|------|------|
| S1 mean bands | Desfavorable |
| S1 sum bands | Muy favorable |
| POC 0–100 zones (74/84) | 67% — Zona de oportunidad |
| S1 item favorability (avg.) | 72% |

The platform adds a fifth: raw 1–5 means coloured at 80/60% of the maximum. This spec picks one rule (§3.3) and drops the others.

## 2. Scope

**In scope**
- Scale definitions and portal rendering from them
- The validated instrument as a locked system template
- The scoring engine: item, dimension and index scores, favorability, bands, goals, suppression of small groups
- Segment snapshot at submission
- Action plans: plans, tasks, measures, progress updates, evidence, team context, notifications, HR dashboard, impact evaluation
- Prerequisite fixes in the current climate module (§5)

**Out of scope (later)**
- AI-suggested actions (the POC has a "Próximamente" placeholder)
- Leader 9-box matrix and leader ranking from the POC
- Weighting items by factor loadings (see OQ-12)
- Billing for dimension selection
- PDF export of reports

## 3. Scoring

### 3.1 Scale definitions

Add a code-level registry of response scales in `src/lib/constants/climate-scales.ts`. Scales are immutable: changing labels or range means adding a new key, never editing an existing one.

```ts
type ScaleKey = "FREQ_4" | "AGREE_5" | "NPS_11";

interface ScaleDefinition {
  key: ScaleKey;
  kind: "frequency" | "agreement" | "nps";
  min: number;
  max: number;
  anchors: Record<number, { es: string; en: string }>;
  favorableMin: number | null; // lowest value counted as favorable
}
```

| Key | Range | Anchors | `favorableMin` |
|-----|-------|---------|----------------|
| `FREQ_4` | 1–4 | 1 Nunca · 2 Casi nunca · 3 Casi siempre · 4 Siempre (OQ-3) | 3 (OQ-2) |
| `AGREE_5` | 1–5 | today's `LIKERT_LABELS` (Muy en desacuerdo … Muy de acuerdo) | 4 |
| `NPS_11` | 0–10 | — | n/a (eNPS uses promoter/detractor) |

- **Where it's stored:** on the question as `config.scale` (both `SurveyQuestion` and `ClimateSurveyTemplateQuestion`). `SurveyQuestionType.LIKERT` stays; the scale key says which Likert.
- **Existing data:** LIKERT questions with no `config.scale` are read as `AGREE_5`, so existing surveys keep scoring the same way.
- **No freezing needed:** questions are already copied per survey, and scale keys never change, so a survey's scale is fixed the moment it's created.
- **Portal:** renders options from the scale definition instead of the hardcoded 1–5 arrays in [portal-climate-survey-form.tsx](../src/components/portal/portal-climate-survey-form.tsx) (`LIKERT_OPTIONS`, line 74; RATING, line 418).
- **Frequency scales don't use mood emojis.** The POC's 😠→😄 set implies agreement or feeling, not frequency.

### 3.2 The validated instrument

Seed a system template, **"Instrumento Kultiva de Clima Organizacional"** (`companyId = null`, `isDefault = true`): 12 dimensions × 5 items on `FREQ_4`, with the item text exactly as in S1 (Appendix A).

**Schema additions**
- `ClimateDimension.code String? @unique`: stable code for system dimensions (`LID`, `CVI`, … see Appendix A). Postgres treats `NULL` `companyId` values as distinct, so the existing `@@unique([companyId, name])` won't stop duplicate system dimensions; `code` does.
- `ClimateSurveyTemplate.instrumentVersion String?`: `"KCO-2026.1"` for this template.
- `ClimateSurvey.instrumentVersion String?`: copied from the template at creation. Scores are only compared across surveys with the same version.
- Question `config.itemCode` (e.g. `"LID-1"`) and `config.locked = true` on instrument items. Item codes let trends and impact evaluation match items across surveys.

**Rules**
- A company picks **whole dimensions** (at least 1, up to 12), never single items. This follows S1's conclusion that companies can buy dimensions separately.
- Instrument items can't be edited, reordered out of their dimension, made optional or deleted one at a time. Removing an item means removing its whole dimension.
- Companies may add custom questions, but only in their own (non-instrument) dimensions. Custom questions are reported separately and never feed the Índice de Clima (§3.3).
- The wizard and builder show instrument items as locked, labelled "Ítem validado".

### 3.3 Calculations

These are pure functions in `src/lib/utils/climate-scoring.ts`, unit-tested and called from [climate-reports.ts](../src/lib/queries/climate-reports.ts). Only complete responses count.

For a group *G* (the whole company, or any segment from §3.5):

| Metric | Definition |
|--------|------------|
| Item mean `m_i(G)` | Mean of answers to item *i* within *G* |
| Item favorability `f_i(G)` | Share of answers to *i* that are `≥ favorableMin` (3 or 4 on `FREQ_4`) |
| Dimension mean `M_d(G)` | Mean of `m_i` over the dimension's items (equal weight) |
| Dimension favorability `F_d(G)` | Mean of `f_i` over the dimension's items |
| **Índice de Clima** `IC(G)` | Mean of `M_d` over the survey's instrument dimensions (equal weight per dimension) |
| Index favorability `F(G)` | Mean of `F_d` over the same dimensions |

- All instrument items are required, so item-weighted and response-weighted means come out the same. Defining the means over items keeps the rule well-defined if that ever changes.
- Means are computed at full precision and shown with 2 decimals. Favorability is shown as a whole percentage.
- Individual respondents never get a score; everything is an aggregate.

### 3.4 Bands

Every mean (item, dimension, IC) gets one of four bands from S1's mean-based table:

| Band | S1 range | Rule (applied to the full-precision mean) | Colour token |
|------|----------|------------------------------------------|--------------|
| Muy favorable | 3.6–4.0 | `≥ 3.55` | `band-very-favorable` (green) |
| Favorable | 3.1–3.5 | `≥ 3.05` | `band-favorable` (light green) |
| Desfavorable | 2.6–3.0 | `≥ 2.55` | `band-unfavorable` (amber) |
| Muy desfavorable | 1.0–2.5 | `< 2.55` | `band-very-unfavorable` (red) |

- **Gaps between S1's ranges:** S1 leaves 2.5–2.6, 3.0–3.1 and 3.5–3.6 uncovered. The cutoffs above are the same as rounding the mean to one decimal, half up, and then applying S1's table (OQ-4).
- **Floating-point edges:** compare after rounding, e.g. `Math.round(mean * 10 + 1e-9) / 10`, so a mean that should be exactly 3.55 but is stored as 3.5499999… still lands in the right band.
- **Sum bands are not used.** S1's per-dimension (5–20) and whole-scale (60–240) sum bands disagree with the mean bands, and they stop working when items are missing or only some dimensions are applied (OQ-1).
- **Bands apply only to the validated instrument.** Custom `AGREE_5` questions show their mean and answer distribution, with no band.
- **Store bands as an enum:** add `enum ClimateBand { MUY_DESFAVORABLE DESFAVORABLE FAVORABLE MUY_FAVORABLE }`, used by goals and plan snapshots.

**What the results show for a dimension (company-wide or any segment):** the mean, the band chip and the favorability, e.g. `3.18 · Favorable · 81% favorable`. Item rows show the mean, favorability and the 1–4 answer distribution.

### 3.5 Segments and the segment snapshot

**Segments:** company, department, hub, team, leader, and later gender, generation and tenure.

- **Leader:** the respondents whose `Employee.managerId` was that leader when they submitted (direct reports only).
- **Demographics:** depend on adding `gender` and `birthDate` to `Employee`, as already flagged in the April analysis. Tenure comes from the existing `startDate`.

**Snapshot at submission:** today [climate-reports.ts](../src/lib/queries/climate-reports.ts) works out department/hub/team from the employee's *current* relations, so a reorganization rewrites past results. Add `SurveyResponse.segmentSnapshot Json` and fill it at submission:

```json
{ "departmentId": "…", "hubId": "…", "teamIds": ["…"], "leaderEmployeeId": "…",
  "tenureBucket": "1-3", "generation": "Millennials", "gender": "F" }
```

All segment breakdowns read the snapshot. For existing responses with no snapshot, the current live lookup is the fallback.

### 3.6 Suppressing small groups

- **The rule:** any group with fewer than *k* complete responses is hidden. That covers its scores, favorability, distributions and open-text answers. *k* = `ClimateSurvey.anonymityThreshold` (default 5; the POC uses 4; OQ-6).
- **Where it applies:** every cut — heatmap cells, leader reports, demographic charts and "Puntos de atención".
- **Hidden groups still count** towards their parent group's results.
- **Known limitation, not solved in V1:** if a parent group has exactly one hidden child, the child can be worked out by subtracting its visible siblings from the parent.
- **This setting does nothing today.** `anonymityThreshold` can be edited in settings, but nothing in the climate reports or results pages reads it (§5).

### 3.7 Goals and "Puntos de atención"

- **The goal is a band:** `ClimateSurvey.goalBand ClimateBand @default(FAVORABLE)`. A dimension or group **has a gap** when its band is below the goal band.
- **It replaces the POC's "meta 75%".** That figure is a 0–100 rescale of the mean (75% = mean 3.25), and people read it as "75% answered favorably" (OQ-5).
- **"Puntos de atención"** lists the dimensions, areas and leaders with a gap, lowest mean first. It only includes groups with n ≥ *k*.

### 3.8 Questions outside the instrument

- **NPS** questions only ever feed eNPS (the existing `calculateNPS`). They never enter the IC, dimension means or any mean on another scale. Note that the instrument item *"¿Recomendarías la organización como un buen lugar para trabajar?"* (CMP-5) is a `FREQ_4` item, not eNPS.
- **Custom LIKERT/RATING** questions are summarised on their own scale. Means are never pooled across scales.
- **TEXT** answers are listed per group and follow the *k* rule.

### 3.9 Trends

The IC and dimension scores can be compared across surveys only when they share an `instrumentVersion`. Items are matched by `itemCode`. This trend feeds the outcome measures in §4.4.

## 4. Action plans

### 4.1 Concepts

**Naming:** the UI says *Plan de acción*, *Tareas* and *Indicadores*. The code uses `ActionPlan`, `ActionPlanTask` and `ActionPlanMeasure`.

| Concept | What it is |
|---------|-----------|
| **Plan de acción** | Commitment to improve **one dimension** in **one scope**, created from **one source survey**. It holds an objective, the baseline (filled in automatically), a target, an owner and dates. |
| **Tarea** | Concrete step inside a plan, with an owner, due date, status, evidence and progress notes. A plan has 1..n tasks. |
| **Indicador** | Something measured to judge the plan. `OUTCOME` is the dimension's score in the plan's scope at the next survey, evaluated automatically; every plan gets exactly one. `PROCESS` is optional and manual (e.g. "1:1s realizados vs. planeados"), with a unit, baseline, target and current value. |
| **Avance** | Timestamped progress entry on a plan, task or process measure: a note, plus an optional new value and/or status change. |
| **Contexto del equipo** | The POC's 4 optional reflection questions a leader answers before planning. One set per leader per survey. |

### 4.2 Scopes and roles

| Scope | Created by | Typical content |
|-------|-----------|-----------------|
| `LEADER` | The leader, for their own direct reports | Team habits (1:1s, recognition, retros) |
| `DEPARTMENT` / `HUB` / `TEAM` | Admin (HR) | Area-level initiatives |
| `ORGANIZATION` | Admin (HR / *gerencia*) | Policies and programs (S2's "Plan de Acción Gerencia") |

| Role | Permissions |
|------|-------------|
| Admin | Create, read, update and delete plans in any scope; reassign owners; see the dashboard; set goal, minimums and deadlines |
| Leader (owner of a `LEADER` plan) | Create and edit their own team's plans and tasks; answer the team context; submit |
| Task owner (any employee) | Update status, notes and evidence on tasks assigned to them; read-only view of the parent plan |
| Follow-up contacts (*seguimiento*) | Notified of submissions and completions; read-only access to all plans of the survey |
| Members | No access to plans in V1 (OQ-13) |

- **Leaders can only plan for a team with n ≥ *k*.** Below that, their team's results roll up into the area, and HR handles it with an area plan.
- **How leaders sign in is open (OQ-10):** a dashboard MANAGER seat, or the employee portal's magic link, which already exists for 360°. The POC's 4-digit leader codes are not carried over.

### 4.3 When plans are needed

1. **Results go to leaders when an admin releases them** (`ClimateSurvey.resultsReleasedAt`). Until then leaders see nothing, matching S2's "restricción de vistas durante la etapa de encuesta".
2. **On release, the system computes each leader's gaps** (§3.7) and emails every leader with at least one: "Tienes N dimensiones por atender".
3. **Each leader with gaps must submit at least `ClimateSurvey.planMinPerLeader` plans** (default 1) by `ClimateSurvey.planDueDate` (default: 15 days after release). Plans may target any dimension, but the UI lists gap dimensions first, lowest mean first. Only plans on gap dimensions count towards the minimum (OQ-7).
4. **Admins can create area and organization plans at any time after release**, straight from a heatmap cell or a "Puntos de atención" card.

### 4.4 Plan lifecycle

**Plan status:** `DRAFT → ACTIVE → COMPLETED | CANCELLED`

- `DRAFT`: saved but not submitted; doesn't count towards the minimum.
- `ACTIVE`: submitted; tasks are in progress.
- `COMPLETED`: every task is `DONE` or `CANCELLED` **and** the owner has written a closing note.
- `CANCELLED`: admin only, with a reason.

**Task status:** `PENDING → IN_PROGRESS → DONE | CANCELLED`
- *Overdue* is worked out (due date before today and not `DONE`/`CANCELLED`), not stored.
- Plan progress = `DONE` tasks ÷ tasks that aren't `CANCELLED`.

**What's filled in automatically when a plan is created:**
- **Baseline:** the source survey's `M_d`, `F_d`, band and n for the plan's scope and dimension. This is a snapshot that never changes later.
- **Default target:** one band above the baseline. The owner can raise it, or add a target mean.

**How the plan's impact is evaluated (outcome indicator):**
- **When:** the next survey that closes with the same `instrumentVersion` and includes the dimension.
- **What's compared:** the same scope, using the snapshot segment where possible. It's evaluated even if the plan is still `ACTIVE`.
- **Result:** the new mean, favorability, band and n, plus the change in mean and in band, labelled:
  - **Mejoró**: band went up
  - **Empeoró**: band went down
  - **Sin cambio de nivel**: same band; the mean change is still shown
  - **No evaluable**: n < *k*, or the scope no longer exists

  Small changes in the mean within the same band are deliberately not called improvements. With team-sized groups they're mostly noise, and S1 found the dimensions are strongly correlated.

### 4.5 Data model

```prisma
// Sketch: relations to Company, ClimateSurvey, ClimateDimension and Employee,
// and the measure↔task / update↔measure relations, are left out for brevity.
enum ClimateBand       { MUY_DESFAVORABLE DESFAVORABLE FAVORABLE MUY_FAVORABLE }
enum ActionPlanScope   { LEADER DEPARTMENT HUB TEAM ORGANIZATION }
enum ActionPlanStatus  { DRAFT ACTIVE COMPLETED CANCELLED }
enum ActionTaskStatus  { PENDING IN_PROGRESS DONE CANCELLED }
enum ActionMeasureKind { OUTCOME PROCESS }

model ActionPlan {
  id              String           @id @default(cuid())
  companyId       String
  surveyId        String           // source survey
  dimensionId     String
  scope           ActionPlanScope
  scopeRefId      String?          // employeeId (LEADER), departmentId, hubId, teamId; null for ORGANIZATION
  ownerEmployeeId String
  title           String
  objective       String
  // Baseline snapshot — never recomputed
  baselineMean          Float
  baselineFavorability  Float
  baselineBand          ClimateBand
  baselineN             Int
  targetBand      ClimateBand
  targetMean      Float?
  startDate       DateTime
  endDate         DateTime
  status          ActionPlanStatus @default(DRAFT)
  submittedAt     DateTime?
  closingNote     String?
  completedAt     DateTime?
  cancelReason    String?
  createdByUserId String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  tasks    ActionPlanTask[]
  measures ActionPlanMeasure[]
  updates  ActionPlanUpdate[]

  @@index([companyId])
  @@index([surveyId, scope, scopeRefId])
  @@index([ownerEmployeeId])
}

model ActionPlanTask {
  id              String           @id @default(cuid())
  planId          String
  title           String
  description     String?
  ownerEmployeeId String?
  dueDate         DateTime
  status          ActionTaskStatus @default(PENDING)
  completedAt     DateTime?
  order           Int
  suggestedActionCode String?      // set when picked from the suggestions library (§4.7)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  plan     ActionPlan           @relation(fields: [planId], references: [id], onDelete: Cascade)
  evidence ActionPlanEvidence[]
  updates  ActionPlanUpdate[]

  @@index([planId])
  @@index([ownerEmployeeId, status])
}

model ActionPlanMeasure {
  id            String            @id @default(cuid())
  planId        String
  taskId        String?           // PROCESS measures may hang off a task
  kind          ActionMeasureKind
  name          String
  unit          String?
  baselineValue Float?
  targetValue   Float?
  currentValue  Float?
  // OUTCOME evaluation result
  followUpSurveyId String?
  resultMean       Float?
  resultFavorability Float?
  resultBand       ClimateBand?
  resultN          Int?
  evaluatedAt      DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  plan ActionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@index([planId])
}

model ActionPlanUpdate {
  id               String   @id @default(cuid())
  planId           String
  taskId           String?
  measureId        String?
  authorEmployeeId String
  note             String
  value            Float?            // new currentValue for a PROCESS measure
  statusFrom       String?
  statusTo         String?
  createdAt        DateTime @default(now())

  plan ActionPlan      @relation(fields: [planId], references: [id], onDelete: Cascade)
  task ActionPlanTask? @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([planId, createdAt])
}

model ActionPlanEvidence {
  id          String   @id @default(cuid())
  taskId      String
  fileName    String
  mimeType    String
  sizeBytes   Int
  storagePath String   // private bucket; served through signed URLs
  uploadedByEmployeeId String
  createdAt   DateTime @default(now())

  task ActionPlanTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
}

model LeaderSurveyContext {
  id               String   @id @default(cuid())
  surveyId         String
  leaderEmployeeId String
  answers          Json     // { q1, q2, q3, q4 }
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([surveyId, leaderEmployeeId])
}
```

**`ClimateSurvey` additions:** `instrumentVersion`, `goalBand`, `planMinPerLeader Int @default(1)`, `planDueDate DateTime?`, `resultsReleasedAt DateTime?`, `followUpUserIds String[]`.
**`SurveyResponse` addition:** `segmentSnapshot Json?`.

**Evidence files:**
- **Bucket:** a new **private** bucket, not the public `SURVEY_ASSETS_BUCKET` used for logos and wallpapers. Served through short-lived signed URLs.
- **Allowed files:** PNG/JPG/WEBP/PDF, max 10 MB each.
- **Not inside records:** the POC stores evidence as base64 data URLs inside the survey's JSON. That doesn't carry over.

**The team context questions** (from the POC, unchanged):
1. ¿Cómo describirías el momento actual de tu equipo?
2. ¿Qué ha cambiado recientemente (personas, carga de trabajo, liderazgo, procesos)?
3. ¿Qué has intentado hasta ahora para mejorar estos resultados?
4. ¿Qué recursos o apoyo necesitarías para avanzar?

### 4.6 Screens

**Leader: "Resultados de mi equipo"** (shown only when n ≥ *k*)
- Summary: the IC and each dimension as mean, band and favorability, with the goal marked.
- **Brechas:** one card per gap dimension, lowest first, with a "Crear plan de acción" button. If plans exist, it shows how many and reads "Agregar otro plan".
- Item detail per dimension: mean, favorability and the 1–4 distribution.
- Team context panel (optional; editable until the plan deadline).
- Minimum-plans banner: "Se espera un mínimo de N planes. Llevas M."

**Leader: plan editor**
- **Pre-filled:** the dimension, scope, read-only baseline, and default target band.
- **Fields:** title, objective (with a hint, e.g. *"Pasar Reconocimiento de Desfavorable a Favorable en el próximo semestre"*) and dates.
- **Tasks:** at least 1, each with a title, owner (themselves by default, or a team member), due date and optional description. Each can be picked from the suggestions library.
- **Process indicators:** optional.
- **Actions:** "Guardar borrador", "Enviar plan" (sets it to `ACTIVE`) and "Guardar y crear otro".

**Task owner: "Mis tareas"**
- A list of assigned tasks: status, add progress note, upload evidence, update a process indicator value.

**Admin: plan dashboard** (per survey, plus an all-surveys view)
- **Compliance:** leaders with gaps who haven't met the minimum, and days left until the deadline, with a bulk reminder.
- **Coverage:** plans per dimension and scope, against the gaps per dimension.
- **Progress:** plans by status, overdue tasks, % of tasks done.
- **Impact:** once a follow-up survey closes, the share of plans per result (*Mejoró / Sin cambio / Empeoró / No evaluable*).
- **Filters:** survey, scope, dimension, owner, status, overdue.
- **Plans from results:** create area or organization plans directly from the heatmap or "Puntos de atención".

### 4.7 Suggested-actions library

S2 calls for **48 suggested actions** (4 per dimension). Store them as system content keyed by dimension code:

```ts
{ code: "LID-A1", dimensionCode: "LID", title: "…", description: "…", suggestedMeasure?: { name, unit } }
```

- **In the task editor:** a "Sugerencias" picker per dimension. Picking one fills in the title, description and, where given, a process indicator. Owners can still write their own.
- **Content dependency:** Kultiva has to write these 48 actions (OQ-8). Until then the picker is hidden.
- **Admin-editable per company:** later, not V1.

### 4.8 Notifications

All sent through the existing Resend setup in `src/lib/email/`. Scheduled ones run from a daily cron, either an extension of `/api/cron/send-reminders` (360° only today) or a new `/api/cron/climate-plans`.

| Trigger | To | Cc |
|---------|----|----|
| Results released, and the leader has gaps | Leader | — |
| Plan submitted | Follow-up contacts | Leader |
| Task assigned | Task owner | — |
| Task due in 3 days / overdue (daily) | Task owner | Plan owner |
| Plan deadline in 3 days and leader below the minimum | Leader | Follow-up contacts |
| All of a leader's plans completed | HR (follow-up contacts) | Leader |
| Follow-up survey closed and impact evaluated | Plan owner, follow-up contacts | — |

## 5. Prerequisite fixes in the current climate module

These are bugs or gaps in code that's already live. Fix them before or with Phase 1:

1. **The overall average mixes scales.** [climate-reports.ts:161](../src/lib/queries/climate-reports.ts) pools every numeric answer, so NPS (0–10) and Likert (1–5) end up in one mean. Replace it with the IC (§3.3), and summarise other questions per scale.
2. **The Análisis tab divides everything by 10 if any NPS question exists.** [survey-insights-tab.tsx:147](../src/components/climate/survey-insights-tab.tsx) uses one survey-wide maximum, so Likert results show at about half. Use each question's own scale.
3. **Heatmap colours ignore the scale's minimum.** The results page's `HeatmapCell` colours by `value / maxScore` at 80/60%, so a mean of 1 on a 1–5 scale shows as 20%. Use band colours (§3.4) for instrument surveys and drop the percentage for the rest.
4. **The minimum group size is never applied.** No climate breakdown reads `anonymityThreshold` (§3.6).
5. **Segments are looked up live** instead of from a snapshot (§3.5).
6. **The portal hardcodes 1–5** for LIKERT and RATING (§3.1).

## 6. Phasing

| Phase | Content | Depends on |
|-------|---------|-----------|
| **P0** | Fixes 1–4 from §5. Scale registry and portal rendering (§3.1). | — |
| **P1** | Instrument template and seed (§3.2, Appendix A). Scoring engine (§3.3–3.4). Results UI with bands and favorability. Segment snapshot (§3.5). Goal band and "Puntos de atención" (§3.7). Results release and the leader team report. | OQ-1–4 |
| **P2** | Action plans core (§4.1–4.6): plans, tasks, process indicators, updates, evidence, team context, leader and admin screens, notifications (§4.8). | P1, OQ-7, OQ-10 |
| **P3** | Outcome evaluation and impact dashboard (§4.4). Suggested-actions library (§4.7). Demographic segments. | P2, OQ-8; `Employee.gender`/`birthDate` |

**Tests:**
- **`climate-scoring.ts` unit tests:** band edges (3.55 → Muy favorable, 3.5499 → Favorable, 3.05 → Favorable, 3.0499 → Desfavorable, 2.55 → Desfavorable, 2.5499 → Muy desfavorable), favorability at `favorableMin`, NPS kept out of the IC, equal dimension weighting with a subset of dimensions, and suppression below *k*.
- **Golden test:** if the psychologist shares S1's anonymised raw data (OQ-14), check the engine against the study's published per-item favorability.
- **Integration tests:** plan permissions per role, the baseline snapshot staying unchanged after new responses or a reorganization, and how overdue status and the minimum are worked out.

## 7. Open questions

Each question lists an owner and the **default this spec assumes** until it's answered.

| ID | Question | Owner | Default assumed |
|----|----------|-------|-----------------|
| OQ-1 | Which interpretation is official: S1's mean bands, S1's sum bands, or the brochure/POC % zones (85/75, 84/74)? Can the sum bands be retired, given they contradict the mean bands (sum 181 = "Muy favorable", mean 3.02 = "Desfavorable")? | Kultiva + psychologist | Mean bands only |
| OQ-2 | Is the "% de frecuencia: favorabilidad" per item the share answering 3 (Casi siempre) or 4 (Siempre)? | Psychologist | Yes (3–4) |
| OQ-3 | Are the anchors *Nunca / Casi nunca / Casi siempre / Siempre*, exactly as validated? (The POC shows agreement labels.) | Kultiva + psychologist | Yes |
| OQ-4 | How should values between S1's ranges (e.g. 3.05, 3.55) be classified? | Psychologist | Round to 1 decimal, half up |
| OQ-5 | Can the goal be a band (default "Favorable") instead of the POC's "meta 75%"? | Kultiva | Yes |
| OQ-6 | Minimum group size *k*: 5 (platform) or 4 (POC)? | Kultiva | 5 |
| OQ-7 | Must a leader plan for **every** gap dimension, or a minimum number (default 1)? Is there a deadline after results are released? | Kultiva | Minimum 1, prioritise lowest; 15-day deadline |
| OQ-8 | Is there a Kultiva methodology for plans (what makes a good task, which indicators to use)? Who writes the 48 suggested actions, and when? | Kultiva | Structure in §4; library hidden until content exists |
| OQ-9 | Anonymous or confidential? Both the POC and the platform store the respondent's identity with their answers, while the POC's notice says "anónima". Option A: keep the link and change the wording to "confidencial". Option B: for `isAnonymous` surveys, store who took part separately from the answers (snapshot only), so "anónima" is true, at the cost of the per-respondent detail view. | Kultiva + legal | Not decided; it blocks the wording of the data-processing notice |
| OQ-10 | How do leaders sign in: a dashboard MANAGER seat, or the employee portal's magic link? | Pluriza + Kultiva | Portal magic link (no seat needed) |
| OQ-11 | May obvious spelling errors in item text be fixed (e.g. "comforme", "lider", missing accents, the space before "?") without affecting validity? | Psychologist | Keep verbatim until approved |
| OQ-12 | Should items be weighted by factor loadings (S1 mentions it as an option)? | Psychologist | No: loadings are similar (0.76–0.96 within dimensions) and come from one company |
| OQ-13 | Should team members see their leader's submitted plans (transparency) in V1? | Kultiva | No |
| OQ-14 | Can the psychologist share S1's anonymised raw data (212 × 60) as a golden test set? | Psychologist | — |
| OQ-15 | The deck's fact sheet says "validez en población colombiana", but the sample is one company of 212 people. Should the template description and sales material soften this? | Kultiva + psychologist | Template description won't make that claim |

## Appendix A — Instrument items (KCO-2026.1)

Text is verbatim from S1, typos included (OQ-11). All items use `FREQ_4`. Item order follows the study. α is the dimension's Cronbach's alpha from S1.

| Code | Dimension | α |
|------|-----------|---|
| LID | Liderazgo | 0.974 |
| CVI | Calidad de vida | 0.908 |
| CMP | Compromiso | 0.945 |
| SPS | Seguridad psicológica | 0.921 |
| COM | Comunicación | 0.944 |
| DEI | Diversidad e inclusión | 0.914 |
| ETI | Ética e integridad | 0.958 |
| SYE | Seguridad y estabilidad | 0.913 |
| GCA | Gestión de cambio | 0.936 |
| CUL | Cultura | 0.956 |
| FYA | Flexibilidad y autonomía | 0.914 |
| SME | Salud mental | 0.921 |

| Item | Text |
|------|------|
| LID-1 | ¿Tu líder proporciona la información necesaria para realizar tu trabajo de manera efectiva? |
| LID-2 | ¿Recibes apoyo de tu líder para alcanzar tus metas de desarrollo en la organización? |
| LID-3 | ¿Tu líder reconoce de manera justa y regular tus logros y esfuerzos? |
| LID-4 | ¿Tu líder es un ejemplo positivo de los valores y principios de la organización? |
| LID-5 | ¿La retroalimentación que recibes de tu líder te ayuda a mejorar tu desempeño? |
| CVI-1 | ¿Sientes que puedes mantener un equilibrio saludable entre tu trabajo y tu vida personal? |
| CVI-2 | ¿Sientes que la carga de trabajo es manejable y realista? |
| CVI-3 | ¿La empresa ofrece recursos específicos para tu bienestar mental, como programas de apoyo emocional? |
| CVI-4 | ¿La organización promueve un estilo de vida saludable entre los empleados? |
| CVI-5 | ¿Sientes que la organización y tus superiores se preocupan genuinamente por tu bienestar personal? |
| CMP-1 | ¿Te sientes identificado/a con la misión y los valores de la organización en tu trabajo diario? |
| CMP-2 | ¿Estás satisfecho/a con tu trabajo en general? |
| CMP-3 | ¿Tienes la intención de permanecer en la organización a largo plazo? |
| CMP-4 | ¿Te sientes motivado/a para dar lo mejor de ti en tu trabajo? |
| CMP-5 | ¿Recomendarías la organización como un buen lugar para trabajar? |
| SPS-1 | ¿Te sientes seguro/a para expresar tus opiniones y puntos de vista en el trabajo? |
| SPS-2 | ¿Sientes que puedes cometer errores sin temor a consecuencias severas? |
| SPS-3 | ¿Sientes que puedes proponer ideas y tomar riesgos sin preocuparte por repercusiones negativas? |
| SPS-4 | ¿Los conflictos en tu equipo se abordan de manera constructiva y respetuosa? |
| SPS-5 | ¿La organización fomenta una cultura de aprendizaje continuo y mejora constante? |
| COM-1 | ¿Tienes la oportunidad de comunicarte abiertamente con tus superiores? |
| COM-2 | ¿Recibes retroalimentación regular sobre tu desempeño en el trabajo? |
| COM-3 | ¿La organización ofrece una variedad de canales de comunicación (reuniones, correos, mensajería, etc.) que facilita la colaboración? |
| COM-4 | ¿Consideras que la organización promueve una cultura de comunicación abierta y honesta? |
| COM-5 | ¿Sientes que la organización ofrece orientación y apoyo durante situaciones de crisis? |
| DEI-1 | ¿Crees que todos los empleados tienen igualdad de oportunidades de desarrollo y avance profesional? |
| DEI-2 | ¿Te sientes bienvenido/a y respetado/a en un ambiente de trabajo inclusivo? |
| DEI-3 | ¿La organización tiene políticas y prácticas que promueven la inclusión y la equidad? |
| DEI-4 | ¿Tienes la oportunidad de participar en grupos o comités relacionados con la diversidad e inclusión? |
| DEI-5 | ¿La organización celebra y reconoce la diversidad a través de eventos y actividades? |
| ETI-1 | ¿Sientes que la organización cumple con todas las normas y regulaciones éticas y legales? |
| ETI-2 | ¿Te sientes seguro/a para denunciar comportamientos inapropiados o éticamente cuestionables? |
| ETI-3 | ¿La organización fomenta la responsabilidad individual en los asuntos éticos del negocio? |
| ETI-4 | ¿Te sientes informado/a sobre las políticas en relación a los conflictos de intereses? |
| ETI-5 | ¿Sientes que las decisiones de la organización se toman de manera ética y basada en valores? |
| SYE-1 | ¿Te sientes seguro/a en tu empleo actual? |
| SYE-2 | ¿Sientes que tienes oportunidades de crecimiento y desarrollo profesional en la organización? |
| SYE-3 | ¿Sientes que tu puesto actual te ofrece estabilidad para planificar tu futuro profesional? |
| SYE-4 | ¿Tienes la intención de permanecer a largo plazo en tu puesto actual? |
| SYE-5 | ¿Estás satisfecho/a con tu nivel salarial y beneficios? |
| GCA-1 | ¿Tienes la oportunidad de participar en decisiones relacionadas con el cambio en la organización? |
| GCA-2 | ¿Recibes el apoyo necesario para adaptarte y tener éxito durante los cambios? |
| GCA-3 | ¿Sientes que se maneja adecuadamente las preocupaciones y la resistencia al cambio en la organización? |
| GCA-4 | ¿Sientes que puedes expresar tus temores o preocupaciones acerca del cambio sin temor? |
| GCA-5 | ¿La organización comunica claramente los beneficios que se esperan del cambio? |
| CUL-1 | ¿La organización es coherente con los valores que promueve ? |
| CUL-2 | ¿Tu lider directo ejemplifica la cultura de la empresa ? |
| CUL-3 | ¿La cultura de la empresa esta alineada con la visión del negocio? |
| CUL-4 | ¿Se comunica y promueven los valores organizacionales ? |
| CUL-5 | ¿La organización premia a los que se comportan comforme a los valores? |
| FYA-1 | ¿Tengo la flexibilidad necesaria para equilibrar mi vida personal y profesional? |
| FYA-2 | ¿Estoy satisfecho con la posibilidad de ajustar mis horarios de trabajo según mis necesidades personales? |
| FYA-3 | ¿Tengo la autonomía suficiente para tomar decisiones relacionadas con mi trabajo diario? |
| FYA-4 | ¿Me siento apoyado por la organización en cuanto a opciones de trabajo remoto o híbrido? |
| FYA-5 | ¿La empresa respalda mi capacidad para gestionar mi propio tiempo y prioridades.? |
| SME-1 | ¿Te sientes mentalmente descansado y capaz de manejar el estrés diario en tu trabajo? |
| SME-2 | ¿Consideras que tienes acceso a los recursos y apoyo necesarios para mantener una buena salud mental en el trabajo? |
| SME-3 | ¿Te sientes cómodo hablando de tus problemas de salud mental con tu supervisor o compañeros de trabajo? |
| SME-4 | ¿Crees que la empresa promueve un ambiente laboral que apoya la salud mental de los empleados? |
| SME-5 | ¿Sientes que puedes equilibrar adecuadamente tus responsabilidades laborales y tu bienestar personal? |

**Notes for the content review:**
- **Item order:** the study lists items grouped by dimension. Whether the portal keeps that order or interleaves dimensions is a UX choice, but changing it should be cleared with the psychologist.
- **FYA items use first person** ("Tengo…", "Estoy…") while the rest use second person ("¿Tú…?"). Raise in OQ-11.
- **Overlapping content:** CMP-3 and SYE-4 both ask about intention to stay. CVI-1, FYA-1 and SME-5 all ask about work–life balance. Worth the experts' content-validity review that S1 recommends.
