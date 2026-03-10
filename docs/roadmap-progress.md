# Kultiva — Roadmap Progress & Implementation Plan

> Last updated: 2026-03-10
> Target: Complete through Section 4 (Clima Laboral / Work Environment)

---

## Current Status Summary

| Module | Status | Completion |
|--------|--------|------------|
| 1. Evaluacion 360 / Feedback | **DONE** | 100% |
| 2. ATS | **NOT STARTED** | 0% |
| 3. Onboarding | **NOT STARTED** | 0% |
| 4. Clima Laboral | **NOT STARTED** | 0% |

---

## Section 1: Evaluacion 360 / Feedback

### 1.1 Ciclos de Evaluacion — DONE

Full lifecycle management implemented.

- Cycle CRUD with states: DRAFT → NOMINATION → IN_PROGRESS → CLOSED → ARCHIVED
- Participant management (add/remove employees)
- External rater support with token-based access
- Self-review, manager, peer, and direct report toggles
- Configurable min/max peers, anonymity threshold
- Email notifications on cycle launch
- **Files**: `src/lib/actions/cycles.ts`, `src/app/(dashboard)/cycles/`

### 1.2 Plantillas de Evaluacion — DONE

Template builder with full question support.

- Template CRUD with sections and questions
- Question types: RATING, TEXT, COMPETENCY_RATING, MULTIPLE_CHOICE
- Reviewer-type filtering per section (e.g., "Self Reflection" only for SELF)
- Duplicate, archive, default template marking
- **Files**: `src/lib/actions/templates.ts`, `src/app/(dashboard)/templates/`

### 1.3 Nominaciones de Evaluadores — DONE

Complete nomination workflow.

- Create/remove nominations with validation (no self-nomination, max peers check, duplicate check)
- Manager approval workflow (approve/reject with reasons)
- Bulk approve nominations
- Auto-approve option when `managerApprovePeers = false`
- Transition from NOMINATION → IN_PROGRESS (blocks if pending nominations remain)
- Nomination stats (total, approved, pending, rejected, progress)
- **Files**: `src/lib/actions/nominations.ts`, `src/app/(dashboard)/nominations/`

### 1.4 Asignacion de Revisiones y Seguimiento — DONE

Review assignment and completion system.

- Auto-save draft responses
- Submit with required question validation (scoped by reviewer type)
- Decline peer/external reviews with reason
- Token-based submission for external raters
- Portal-based review for employees without platform access
- Review status tracking: PENDING → IN_PROGRESS → COMPLETED/DECLINED
- **Files**: `src/lib/actions/reviews.ts`, `src/app/(dashboard)/my-reviews/`

### 1.5 Reportes Individuales — DONE

Report generation and release system.

- Aggregated scores by reviewer type (self, manager, peer, direct report)
- Anonymity threshold enforcement (hides data below minimum respondents)
- Release/unrelease reports per participant or in bulk
- CSV export
- Employee access via dashboard (`/my-feedback`) or portal (`/portal/reports/`)
- **Files**: `src/lib/actions/reports.ts`, `src/lib/queries/reports.ts`, `src/app/(dashboard)/reports/`

### 1.6 Competencias Organizacionales — DONE

Full competency management and reporting.

- Competency CRUD server actions (`src/lib/actions/competencies.ts`)
- Competency catalog management UI at `/settings/company/competencies`
- Category support: organizational, functional, leadership
- Duplicate name validation, deletion protection when used by questions
- Competency selection in template builder for COMPETENCY_RATING questions
- Competency-level aggregation in individual reports (`competencyScores`)
- Per-reviewer-type competency breakdown with self-vs-others gap analysis
- CompetencyScores display component in admin and employee report views
- Template detail view shows linked competency name per question
- Settings nav updated with Competencies link
- **Files**: `src/lib/actions/competencies.ts`, `src/components/settings/competencies-manager.tsx`, `src/app/(dashboard)/settings/company/competencies/page.tsx`, `src/components/reports/competency-scores.tsx`

### Cross-Cutting (360 Module)

| Feature | Status |
|---------|--------|
| Employee Portal (magic link auth) | DONE |
| Dual notification routing (member email vs portal magic link) | DONE |
| Cron-based review reminders | DONE |
| Employee vs Member model separation | DONE |
| Analytics dashboard | PARTIAL (basic metrics + competency aggregation) |
| PDF report export | NOT STARTED |

---

## Section 2: ATS — NOT STARTED

Only the feature flag (`company.featureAts`) and toggle UI in settings exist. No schema models, routes, or actions.

### Features Required (per spec)

| Feature | Spec Section | Complexity |
|---------|-------------|------------|
| Job Postings | 2.1 | Medium |
| Careers Portal | 2.2 | Medium |
| Recruitment Pipeline (Kanban) | 2.3 | High |
| Candidate Management | 2.4 | Medium |
| Interview Scheduling | 2.5 | High |
| Candidate Scorecards | 2.6 | Medium |
| Job Offers & Letters | 2.7 | Medium |
| Recruitment Reports | 2.8 | Medium |
| Job Board Integration | 2.9 | High (external APIs) |

---

## Section 3: Onboarding — NOT STARTED

Only the feature flag (`company.featureOnboarding`) and toggle UI exist. The `/onboarding` route is the platform company-setup page, not the employee onboarding module.

### Features Required (per spec)

| Feature | Spec Section | Complexity |
|---------|-------------|------------|
| Onboarding Plans with Checklists | 3.1 | Medium |
| Automatic Task Generation | 3.2 | Medium |
| Buddy/Mentor Assignment | 3.3 | Low |
| Onboarding Experience Surveys (30/60/90) | 3.4 | Medium |

---

## Section 4: Clima Laboral / Work Environment — NOT STARTED

Only the feature flag (`company.featureWorkEnv`) and toggle UI exist. A marketing page at `/diagnostico-clima` exists but has no functional implementation.

### Features Required (per spec)

| Feature | Spec Section | Complexity |
|---------|-------------|------------|
| Climate Surveys (builder + distribution) | 4.1 | Medium |
| eNPS (Employee Net Promoter Score) | 4.2 | Low-Medium |
| Engagement Dimensions & Benchmarking | 4.3 | Medium |
| Reports & Dashboards (heatmaps, trends) | 4.4 | Medium |

---

## Implementation Plan

### Recommended Build Order

```
Phase 1: Complete 360 Gaps (Competencies)     ~1 sprint
Phase 2: Clima Laboral (Section 4)            ~2 sprints
Phase 3: Onboarding (Section 3)               ~2 sprints
Phase 4: ATS (Section 2)                      ~4 sprints
```

> **Rationale**: Clima Laboral before ATS because it reuses the same survey/question/response architecture as 360 reviews. ATS is the largest module with entirely new entity types.

---

### Phase 1: Complete 360 Gaps (Competencies)

**Goal**: Close the remaining gap in Section 1.

1. **Competency Catalog UI** — New page at `/settings/company/competencies`
   - CRUD for competencies (name, description, category)
   - Categories: organizational, functional, leadership
   - Department and role assignment
   - Server actions: `createCompetency`, `updateCompetency`, `deleteCompetency`

2. **Competency Reporting** — Enhance individual reports
   - Aggregate scores by competency (in addition to by section)
   - Radar chart visualization for competency maps
   - Competency gap identification (self vs others)

3. **Analytics Enhancements**
   - Department-level competency aggregation
   - Organization-wide competency heatmap

---

### Phase 2: Clima Laboral (Section 4)

**Goal**: Full work environment survey system.

**Schema additions:**
```
ClimateSurvey        — id, name, description, companyId, type (CLIMATE/PULSE/ENPS), status, frequency, anonymityLevel
ClimateDimension     — id, name, description, companyId, isDefault
SurveyQuestion       — id, surveyId, dimensionId, text, type, order, isRequired
SurveyDistribution   — id, surveyId, targetType (ALL/DEPARTMENT/CUSTOM), targetIds, sentAt, dueDate
SurveyResponse       — id, distributionId, employeeId (nullable for anonymous), submittedAt
SurveyAnswer         — id, responseId, questionId, ratingValue, textValue
```

**Implementation steps:**

1. **4.1 Survey Builder** — Reuse template pattern from 360
   - Survey CRUD with dimensions (categories like Leadership, Culture, Compensation, Growth)
   - Question types: Likert scale, text, NPS (0-10)
   - Distribution targeting: all employees, by department, custom list
   - Anonymous response collection via portal or dashboard
   - Automatic and manual reminders

2. **4.2 eNPS**
   - Standard NPS question ("How likely are you to recommend...") with 0-10 scale
   - NPS calculation: (% Promoters - % Detractors)
   - Recurring pulse schedule (monthly/quarterly)
   - Trend tracking over time

3. **4.3 Engagement Dimensions**
   - Pre-defined dimension framework (can be customized per company)
   - Default dimensions: Leadership, Communication, Work-Life Balance, Growth, Recognition, Culture, Compensation
   - Department-level comparison
   - Benchmark scores (internal period-over-period)

4. **4.4 Reports & Dashboards**
   - Heatmap by department × dimension
   - Trend lines across survey cycles
   - Participation rate tracking
   - Response distribution charts
   - Export to CSV/PDF
   - Action plan tracking (optional)

---

### Phase 3: Onboarding (Section 3)

**Goal**: Structured employee onboarding system.

**Schema additions:**
```
OnboardingPlan          — id, name, description, companyId, departmentId, isDefault, status
OnboardingPhase         — id, planId, name, order, daysFromStartBegin, daysFromStartEnd
OnboardingTaskTemplate  — id, phaseId, title, description, type (FORM/DOCUMENT/MEETING/MATERIAL/FREE), responsibleType (EMPLOYEE/MANAGER/HR/IT), relativeDaysDue, isRequired
OnboardingInstance      — id, planId, employeeId, startDate, status (IN_PROGRESS/COMPLETED), progressPercent
OnboardingTask          — id, instanceId, templateId, assigneeId, dueDate, status (PENDING/IN_PROGRESS/COMPLETED/OVERDUE), completedAt
BuddyAssignment         — id, instanceId, buddyEmployeeId, assignedAt
```

**Implementation steps:**

1. **3.1 Plan Builder**
   - Plan templates with phases (Pre-arrival, Day 1, Week 1, Month 1, 90 Days)
   - Task templates with relative deadlines and responsible party types
   - Plan assignment on employee creation
   - Auto-calculate real dates from start date

2. **3.2 Automatic Tasks**
   - Rule-based task generation when onboarding instance is created
   - Responsible party assignment based on org chart (manager, HR admin)
   - Automated reminders for overdue tasks
   - System integration hooks (placeholder for access provisioning)

3. **3.3 Buddy/Mentor Assignment**
   - Admin or manager assigns a buddy from the same department
   - Buddy receives notification with onboarding context
   - Buddy dashboard showing assigned new hires

4. **3.4 Experience Surveys**
   - Pre-built 30/60/90 day survey templates
   - Auto-triggered based on onboarding timeline
   - Results visible to HR admin and manager
   - Integration with Clima Laboral survey engine (reuse from Phase 2)

---

### Phase 4: ATS (Section 2)

**Goal**: Full applicant tracking system.

**Schema additions** (major — ~15 new models):
```
Job, JobApplication, Candidate, Pipeline, PipelineStage, CandidateStageHistory,
Interview, Interviewer, Scorecard, ScorecardTemplate, ScorecardCriteria, ScorecardRating,
JobOffer, OfferApproval, CareerPageConfig
```

**Implementation steps (grouped by priority):**

**MVP (2A — Core)**
1. **2.1 Job Postings** — CRUD, status workflow, department assignment, application form config
2. **2.3 Pipeline** — Stage builder, default pipeline, drag-and-drop Kanban UI
3. **2.4 Candidates** — Profile, notes, tags, documents, application timeline
4. **2.2 Careers Portal** — Public tenant-branded page, job listing, application form, candidate account

**Evaluation (2B)**
5. **2.5 Interview Scheduling** — Type selection, interviewer panel, calendar integration (Google/Outlook), confirmation flow
6. **2.6 Scorecards** — Template builder, criteria with scales, post-interview evaluation, aggregated comparison view

**Closing (2C)**
7. **2.7 Offers** — Letter templates with variables, multi-step approval flow, send/accept/reject/negotiate, e-signature
8. **2.8 Reports** — Time-to-hire, pipeline conversion rates, source analysis, department breakdown

**Integration (2D — can defer)**
9. **2.9 Job Board Integration** — LinkedIn Jobs, Indeed API connectors, bidirectional sync

---

## Infrastructure & Testing

| Item | Status |
|------|--------|
| Vitest config | DONE |
| Unit tests (utils, validations, permissions, roles) | DONE — 113 tests |
| Integration tests (actions: portal, reviews, nominations, departments, notifications) | DONE — 57 tests |
| Total tests | **170 passing** |

### Testing Plan for New Modules

Each new module should include:
- Unit tests for validation schemas and utility functions
- Integration tests for all server actions (with mocked Prisma)
- Auth/permission tests per role (Admin, Manager, Member)
- Edge case coverage (empty states, boundary conditions, concurrent access)
