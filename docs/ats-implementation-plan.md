# PeerHub ATS Module — Comprehensive Implementation Plan

## Table of Contents
1. [Data Model](#1-data-model)
2. [Permissions](#2-permissions)
3. [Pages & Routes](#3-pages--routes)
4. [Server Actions](#4-server-actions)
5. [API Routes](#5-api-routes)
6. [Sidebar Navigation](#6-sidebar-navigation)
7. [Public Job Board](#7-public-job-board)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Data Model

### 1.1 New Enums

Add these to `prisma/schema.prisma` in the ENUMS section:

```prisma
enum JobStatus {
  DRAFT
  OPEN
  ON_HOLD
  CLOSED
  ARCHIVED
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  TEMPORARY
  FREELANCE
}

enum WorkModality {
  ON_SITE
  REMOTE
  HYBRID
}

enum ApplicationStatus {
  NEW
  SCREENING
  INTERVIEW
  EVALUATION
  OFFER
  HIRED
  REJECTED
  WITHDRAWN
}

enum InterviewType {
  PHONE_SCREEN
  VIDEO
  IN_PERSON
  PANEL
  TECHNICAL
  CULTURAL_FIT
}

enum InterviewStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
  RESCHEDULED
}

enum CandidateSource {
  DIRECT_APPLICATION
  REFERRAL
  LINKEDIN
  JOB_BOARD
  CAREER_PAGE
  AGENCY
  INTERNAL
  OTHER
}

enum EvaluationTemplateType {
  REVIEW
  CANDIDATE_EVALUATION
}
```

### 1.2 New Models

```prisma
// ============================================
// ATS - APPLICANT TRACKING SYSTEM
// ============================================

model JobPosition {
  id              String        @id @default(cuid())
  companyId       String
  title           String
  slug            String
  description     String?       @db.Text
  requirements    String?       @db.Text
  responsibilities String?      @db.Text
  departmentId    String?
  hiringManagerId String?
  status          JobStatus     @default(DRAFT)
  jobType         JobType       @default(FULL_TIME)
  workModality    WorkModality  @default(ON_SITE)
  location        String?
  salaryMin       Decimal?      @db.Decimal(12, 2)
  salaryMax       Decimal?      @db.Decimal(12, 2)
  salaryCurrency  String?       @default("USD")
  openings        Int           @default(1)
  publishedAt     DateTime?
  closedAt        DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  company        Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  department     Department?       @relation(fields: [departmentId], references: [id])
  hiringManager  CompanyUser?      @relation("HiringManager", fields: [hiringManagerId], references: [id])
  applications   Application[]
  pipelineStages JobPipelineStage[]
  evaluationTemplateId String?
  evaluationTemplate   Template?  @relation("JobEvaluationTemplate", fields: [evaluationTemplateId], references: [id])

  @@unique([companyId, slug])
  @@index([companyId])
  @@index([status])
  @@index([departmentId])
  @@index([hiringManagerId])
}

model JobPipelineStage {
  id            String   @id @default(cuid())
  jobPositionId String
  name          String
  description   String?
  order         Int
  color         String?  @default("#6B7280")
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  jobPosition  JobPosition   @relation(fields: [jobPositionId], references: [id], onDelete: Cascade)
  applications Application[]

  @@index([jobPositionId])
}

model Candidate {
  id          String          @id @default(cuid())
  companyId   String
  email       String
  firstName   String
  lastName    String
  phone       String?
  linkedinUrl String?
  portfolioUrl String?
  resumeUrl   String?
  location    String?
  currentTitle String?
  currentCompany String?
  source      CandidateSource @default(DIRECT_APPLICATION)
  sourceDetail String?
  referredById String?
  notes       String?         @db.Text
  tags        String[]
  isArchived  Boolean         @default(false)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  company      Company        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  referredBy   CompanyUser?   @relation("CandidateReferrer", fields: [referredById], references: [id])
  applications Application[]

  @@unique([companyId, email])
  @@index([companyId])
  @@index([email])
  @@index([companyId, isArchived])
}

model Application {
  id              String            @id @default(cuid())
  candidateId     String
  jobPositionId   String
  pipelineStageId String?
  status          ApplicationStatus @default(NEW)
  appliedAt       DateTime          @default(now())
  rejectedAt      DateTime?
  rejectionReason String?
  hiredAt         DateTime?
  withdrawnAt     DateTime?
  coverLetter     String?           @db.Text
  customFields    Json?
  rating          Int?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  candidate     Candidate              @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  jobPosition   JobPosition            @relation(fields: [jobPositionId], references: [id], onDelete: Cascade)
  pipelineStage JobPipelineStage?      @relation(fields: [pipelineStageId], references: [id])
  interviews    Interview[]
  evaluations   CandidateEvaluation[]
  activities    ApplicationActivity[]

  @@unique([candidateId, jobPositionId])
  @@index([jobPositionId])
  @@index([candidateId])
  @@index([status])
  @@index([pipelineStageId])
}

model Interview {
  id              String          @id @default(cuid())
  applicationId   String
  interviewType   InterviewType   @default(VIDEO)
  status          InterviewStatus @default(SCHEDULED)
  title           String?
  scheduledAt     DateTime
  duration        Int             @default(60)
  location        String?
  meetingUrl      String?
  notes           String?         @db.Text
  cancelReason    String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  application  Application          @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  interviewers InterviewParticipant[]

  @@index([applicationId])
  @@index([scheduledAt])
  @@index([status])
}

model InterviewParticipant {
  id           String   @id @default(cuid())
  interviewId  String
  companyUserId String
  isOrganizer  Boolean  @default(false)
  feedback     String?  @db.Text
  rating       Int?
  submittedAt  DateTime?
  createdAt    DateTime @default(now())

  interview   Interview   @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  companyUser CompanyUser @relation("InterviewParticipant", fields: [companyUserId], references: [id])

  @@unique([interviewId, companyUserId])
  @@index([interviewId])
  @@index([companyUserId])
}

model CandidateEvaluation {
  id              String   @id @default(cuid())
  applicationId   String
  evaluatorId     String
  templateId      String?
  overallRating   Int?
  overallComment  String?  @db.Text
  recommendation  String?
  submittedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  application Application           @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  evaluator   CompanyUser            @relation("CandidateEvaluator", fields: [evaluatorId], references: [id])
  template    Template?              @relation("EvaluationTemplate", fields: [templateId], references: [id])
  responses   EvaluationResponse[]

  @@unique([applicationId, evaluatorId])
  @@index([applicationId])
  @@index([evaluatorId])
}

model EvaluationResponse {
  id           String   @id @default(cuid())
  evaluationId String
  questionId   String
  ratingValue  Int?
  textValue    String?
  selectedOptions String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  evaluation CandidateEvaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  question   TemplateQuestion    @relation(fields: [questionId], references: [id])

  @@unique([evaluationId, questionId])
  @@index([evaluationId])
}

model ApplicationActivity {
  id            String   @id @default(cuid())
  applicationId String
  actorId       String?
  action        String
  description   String
  metadata      Json?
  createdAt     DateTime @default(now())

  application Application  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  actor       CompanyUser? @relation("ActivityActor", fields: [actorId], references: [id])

  @@index([applicationId])
  @@index([createdAt])
}
```

### 1.3 Relations to Add to Existing Models

The following existing models need new relation fields added:

**Company** model — add:
```prisma
  jobPositions JobPosition[]
  candidates   Candidate[]

  // Job Board branding & custom domain
  jobBoardEnabled     Boolean  @default(false)
  jobBoardTitle       String?                    // e.g. "Careers at Acme"
  jobBoardDescription String?  @db.Text          // Intro text / about the company
  jobBoardLogoUrl     String?                    // Override logo for the public board
  jobBoardCoverUrl    String?                    // Hero/banner image
  jobBoardAccentColor String?  @default("#7C3E8F") // Primary brand color
  jobBoardCustomCss   String?  @db.Text          // Optional CSS overrides for advanced branding
  jobBoardCustomDomain String? @unique           // e.g. "careers.acme.com"
  jobBoardDomainVerified Boolean @default(false) // DNS verification status
```

**Department** model — add:
```prisma
  jobPositions JobPosition[]
```

**CompanyUser** model — add:
```prisma
  hiringJobs          JobPosition[]           @relation("HiringManager")
  referredCandidates  Candidate[]             @relation("CandidateReferrer")
  interviewParticipations InterviewParticipant[] @relation("InterviewParticipant")
  candidateEvaluations CandidateEvaluation[]  @relation("CandidateEvaluator")
  applicationActivities ApplicationActivity[] @relation("ActivityActor")
```

**Template** model — add:
```prisma
  jobPositions JobPosition[] @relation("JobEvaluationTemplate")
  candidateEvaluations CandidateEvaluation[] @relation("EvaluationTemplate")
```

**TemplateQuestion** model — add:
```prisma
  evaluationResponses EvaluationResponse[]
```

### 1.4 Reusing the Template/Question System for Candidate Evaluations

The existing `Template` / `TemplateSection` / `TemplateQuestion` system is reusable as-is for candidate evaluations. Here is the strategy:

1. **No schema changes needed to Template/TemplateSection/TemplateQuestion themselves.** The existing `QuestionType` enum (RATING, TEXT, COMPETENCY_RATING, MULTIPLE_CHOICE) covers all the question types needed for candidate evaluations (e.g., "Rate communication skills 1-5", "Describe cultural fit observations", etc.).

2. **Template context is implicit.** A template used for job evaluation is simply a Template whose `id` is referenced by `JobPosition.evaluationTemplateId`. There is no need for a discriminator field on Template itself. Admins can create templates specifically for evaluations and assign them to positions. The existing template builder UI at `/templates/new` already supports creating templates with sections and questions, so it can be used directly.

3. **EvaluationResponse mirrors ReviewResponse.** The `EvaluationResponse` model has the same structure as `ReviewResponse` — it references a `TemplateQuestion` and stores `ratingValue`, `textValue`, and `selectedOptions`. This allows the same question-rendering components (`src/components/reviews/review-form.tsx` pattern) to be reused for evaluation forms.

4. **Optional enhancement (Phase 4):** Add an `EvaluationTemplateType` enum or a `category` string field to `Template` to allow filtering templates by purpose ("review" vs "candidate_evaluation") in the UI. This is cosmetic and not required for the data model to function.

### 1.5 Default Pipeline Stages

When a JobPosition is created, the system should auto-generate default pipeline stages:

| Order | Name           | Color    |
|-------|---------------|----------|
| 0     | Applied       | #6B7280  |
| 1     | Screening     | #F59E0B  |
| 2     | Interview     | #3B82F6  |
| 3     | Evaluation    | #8B5CF6  |
| 4     | Offer         | #10B981  |
| 5     | Hired         | #059669  |

---

## 2. Permissions

### 2.1 New Permission Resources

Add to the `Resource` type in `src/lib/permissions/abilities.ts`:

```typescript
type Resource =
  | "company"
  | "user"
  | "department"
  | "template"
  | "cycle"
  | "participant"
  | "nomination"
  | "review"
  | "report"
  | "settings"
  // ATS resources
  | "job_position"
  | "candidate"
  | "application"
  | "interview"
  | "evaluation";
```

### 2.2 Role-Based Permission Matrix

| Resource       | ADMIN                                     | MANAGER                              | EMPLOYEE           |
|----------------|-------------------------------------------|--------------------------------------|--------------------|
| job_position   | create, read, update, delete, manage      | read (own department + assigned)     | read (published)   |
| candidate      | create, read, update, delete              | read, create                         | create (referral only) |
| application    | create, read, update, delete, manage      | read, update (as hiring manager)     | —                  |
| interview      | create, read, update, delete              | create, read, update (as participant)| read (as participant) |
| evaluation     | create, read, update, delete, manage      | create, read, update                 | create, read, update (own) |

### 2.3 Updated ROLE_PERMISSIONS

Add to the `ROLE_PERMISSIONS` constant:

```typescript
ADMIN: {
  // ... existing permissions ...
  job_position: ["create", "read", "update", "delete", "manage"],
  candidate: ["create", "read", "update", "delete"],
  application: ["create", "read", "update", "delete", "manage"],
  interview: ["create", "read", "update", "delete"],
  evaluation: ["create", "read", "update", "delete", "manage"],
},
MANAGER: {
  // ... existing permissions ...
  job_position: ["read"],
  candidate: ["read", "create"],
  application: ["read", "update"],
  interview: ["create", "read", "update"],
  evaluation: ["create", "read", "update"],
},
EMPLOYEE: {
  // ... existing permissions ...
  job_position: ["read"],
  candidate: ["create"],
  application: [],
  interview: ["read"],
  evaluation: ["create", "read", "update"],
},
```

### 2.4 Contextual Permission Checks

Add new cases to `checkContextualPermission`:

```typescript
case "job_position":
  // Managers can manage positions where they are hiring manager
  if (role === "MANAGER" && context?.hiringManagerId === session.companyUser.id) {
    return ["read", "update", "manage"].includes(action);
  }
  // Employees can only see published (OPEN) positions
  if (role === "EMPLOYEE" && action === "read") {
    return true; // further filtered by status at query level
  }
  break;

case "application":
  // Managers can manage applications for their hiring positions
  if (role === "MANAGER" && context?.hiringManagerId === session.companyUser.id) {
    return ["read", "update", "manage"].includes(action);
  }
  break;

case "interview":
  // Participants can read interviews they are part of
  if (action === "read" && context?.isInterviewParticipant) {
    return true;
  }
  break;

case "evaluation":
  // Anyone can create/update their own evaluations
  if ((action === "create" || action === "update") && context?.resourceUserId === userId) {
    return true;
  }
  break;
```

### 2.5 Extended PermissionContext

```typescript
interface PermissionContext {
  // ... existing fields ...
  hiringManagerId?: string;
  isInterviewParticipant?: boolean;
}
```

---

## 3. Pages & Routes

All new routes live under `src/app/(dashboard)/ats/` to namespace the ATS module cleanly within the dashboard route group.

### 3.1 Route Structure

```
src/app/(dashboard)/ats/
  page.tsx                              — ATS dashboard/overview
  jobs/
    page.tsx                            — Job positions list
    new/
      page.tsx                          — Create new job position
    [id]/
      page.tsx                          — Job position detail + pipeline (Kanban)
      edit/
        page.tsx                        — Edit job position
      applications/
        [applicationId]/
          page.tsx                      — Application detail
  candidates/
    page.tsx                            — Candidate database
    new/
      page.tsx                          — Add new candidate
    [id]/
      page.tsx                          — Candidate profile + application history
      edit/
        page.tsx                        — Edit candidate
  interviews/
    page.tsx                            — Interview calendar/list
  evaluations/
    [applicationId]/
      page.tsx                          — Evaluate a candidate (form)
```

### 3.2 Page Descriptions

**`/ats` — ATS Dashboard**
- Summary stats: Open positions, Active candidates, Pending interviews, Hires this month
- Uses `StatCard` component from `src/components/design-system/stat-card.tsx`
- Quick-action cards: "Create Job Position", "Add Candidate"
- Recent activity feed (latest ApplicationActivity entries)
- Chart showing pipeline funnel for all open positions (using `recharts`, already a dependency)

**`/ats/jobs` — Job Positions List**
- Table/card grid of all positions with filters: status, department, job type
- Each card shows: title, department, status badge, # applicants, hiring manager avatar
- "Create Position" button top-right (Admin only)
- Pattern: mirrors `src/app/(dashboard)/cycles/page.tsx` with server-side data fetch + Suspense

**`/ats/jobs/new` — Create Job Position**
- Multi-step form (similar to `src/components/cycles/cycle-wizard.tsx`)
- Step 1: Basic info (title, department, hiring manager, job type, work modality, location)
- Step 2: Description (rich text for description, requirements, responsibilities)
- Step 3: Compensation (salary range, currency)
- Step 4: Pipeline setup (default stages pre-filled, customizable)
- Step 5: Evaluation template selection (pick from existing templates)

**`/ats/jobs/[id]` — Job Position Detail + Pipeline Kanban**
- Header: job title, status badge, key info (department, type, salary, location)
- Tab navigation: "Pipeline" | "Details" | "Team" | "Analytics"
- **Pipeline tab (default):** Kanban board showing applications as cards in stage columns
  - Each card: candidate name, avatar/initials, applied date, rating stars, source badge
  - Drag-and-drop between columns (using `@hello-pangea/dnd` or custom DnD)
  - Click card opens application detail sheet/drawer
  - Filter bar: search, source, rating
- **Details tab:** Read-only display of job description, requirements, etc.
- **Team tab:** Hiring manager + interview panel members
- **Analytics tab:** Time-to-fill, source breakdown chart, stage conversion rates

**`/ats/jobs/[id]/applications/[applicationId]` — Application Detail**
- Left panel: Candidate info (name, email, phone, resume link, LinkedIn, source)
- Center: Activity timeline (all ApplicationActivity entries, chronological)
- Right panel:
  - Current stage indicator
  - Stage advancement controls
  - Scheduled interviews list with status
  - Evaluations summary (average rating, evaluator list)
  - Action buttons: "Schedule Interview", "Request Evaluation", "Reject", "Make Offer"

**`/ats/candidates` — Candidate Database**
- Searchable, filterable table of all candidates in the company
- Columns: name, email, current title/company, source, # applications, tags, last activity
- Filters: source, tags, archived status
- Bulk actions: tag, archive
- Pattern: mirrors `src/app/(dashboard)/people/page.tsx` (table-based)

**`/ats/candidates/[id]` — Candidate Profile**
- Header: candidate full name, contact details, resume/linkedin links
- Application history: list of all positions they applied to, with status
- Notes section: editable free-text notes
- Tags: editable tag chips

**`/ats/interviews` — Interview Schedule**
- Calendar-style or list view of all upcoming interviews
- Filter by: date range, interviewer, position
- Each entry shows: candidate name, position, interview type, scheduled time, interviewers
- Quick link to application detail

**`/ats/evaluations/[applicationId]` — Candidate Evaluation Form**
- Renders the evaluation template associated with the job position
- Uses same rendering pattern as `src/components/reviews/review-form.tsx`
- Rating questions, text questions, competency ratings
- Save draft + Submit functionality
- Read-only view of other evaluators' submitted evaluations (if Admin/Manager)

### 3.3 Kanban Board Component

New component: `src/components/ats/pipeline-kanban.tsx`

This is a client-side component that renders the pipeline stages as columns and applications as draggable cards.

Key considerations:
- **New dependency needed:** `@hello-pangea/dnd` (maintained fork of `react-beautiful-dnd`). Alternatively, use native HTML drag-and-drop with `onDragStart`/`onDragOver`/`onDrop` to avoid adding a dependency.
- **Optimistic updates:** On drag end, immediately update local state and call a server action / API route in the background. On failure, revert.
- **Card component:** `src/components/ats/application-card.tsx` — shows candidate name, applied date, rating, source icon
- **Column header:** Stage name, count badge, color indicator

---

## 4. Server Actions

All server actions go in `src/lib/actions/ats.ts` (or split into `ats-jobs.ts`, `ats-candidates.ts`, `ats-applications.ts` if the file grows large). They follow the exact same pattern as `cycles.ts` and `users.ts`: `"use server"` directive, `auth()` for session, company scoping, `ActionResult<T>` return type, `revalidatePath()` calls.

### 4.1 Job Position Actions

```typescript
// src/lib/actions/ats-jobs.ts
"use server";

export async function createJobPosition(
  input: CreateJobPositionInput
): Promise<ActionResult<JobPosition>>
// - Admin only
// - Creates position + default pipeline stages in a transaction
// - Generates slug from title
// - Revalidates /ats/jobs

export async function updateJobPosition(
  jobId: string,
  data: Partial<UpdateJobPositionInput>
): Promise<ActionResult<JobPosition>>
// - Admin or assigned hiring manager
// - Only DRAFT/OPEN positions can be edited
// - Revalidates /ats/jobs and /ats/jobs/[id]

export async function publishJobPosition(
  jobId: string
): Promise<ActionResult<JobPosition>>
// - Admin only
// - Transitions DRAFT -> OPEN, sets publishedAt
// - Revalidates /ats/jobs

export async function closeJobPosition(
  jobId: string,
  reason?: string
): Promise<ActionResult<JobPosition>>
// - Admin only
// - Transitions OPEN/ON_HOLD -> CLOSED, sets closedAt

export async function archiveJobPosition(
  jobId: string
): Promise<ActionResult<JobPosition>>
// - Admin only
// - Sets status to ARCHIVED

export async function updatePipelineStages(
  jobId: string,
  stages: { id?: string; name: string; order: number; color?: string }[]
): Promise<ActionResult>
// - Admin or hiring manager
// - Deletes removed stages (only if no applications in them), updates existing, creates new

export async function duplicateJobPosition(
  jobId: string
): Promise<ActionResult<JobPosition>>
// - Admin only
// - Copies position + pipeline stages, resets status to DRAFT
```

### 4.2 Candidate Actions

```typescript
// src/lib/actions/ats-candidates.ts
"use server";

export async function createCandidate(
  input: CreateCandidateInput
): Promise<ActionResult<Candidate>>
// - Admin or Manager
// - Checks unique constraint on (companyId, email)
// - Revalidates /ats/candidates

export async function updateCandidate(
  candidateId: string,
  data: Partial<UpdateCandidateInput>
): Promise<ActionResult<Candidate>>
// - Admin only
// - Verifies candidate belongs to company

export async function archiveCandidate(
  candidateId: string
): Promise<ActionResult>
// - Admin only
// - Soft archive (isArchived = true)

export async function addCandidateTags(
  candidateId: string,
  tags: string[]
): Promise<ActionResult<Candidate>>
// - Admin or Manager

export async function removeCandidateTag(
  candidateId: string,
  tag: string
): Promise<ActionResult<Candidate>>
// - Admin or Manager
```

### 4.3 Application Actions

```typescript
// src/lib/actions/ats-applications.ts
"use server";

export async function createApplication(
  input: CreateApplicationInput
): Promise<ActionResult<Application>>
// - Admin or Manager
// - Creates application, assigns to first pipeline stage
// - Creates ApplicationActivity("Application created")
// - If candidate doesn't exist, creates Candidate first (upsert by email)
// - Revalidates /ats/jobs/[jobId]

export async function moveApplicationToStage(
  applicationId: string,
  pipelineStageId: string
): Promise<ActionResult<Application>>
// - Admin or hiring manager
// - Updates pipelineStageId + updates status based on stage mapping
// - Creates ApplicationActivity("Moved to [stage name]")
// - Revalidates /ats/jobs/[jobId]

export async function rejectApplication(
  applicationId: string,
  reason?: string
): Promise<ActionResult<Application>>
// - Admin or hiring manager
// - Sets status = REJECTED, rejectedAt = now
// - Creates ApplicationActivity("Application rejected")

export async function withdrawApplication(
  applicationId: string
): Promise<ActionResult<Application>>
// - Admin only
// - Sets status = WITHDRAWN, withdrawnAt = now

export async function hireCandidate(
  applicationId: string
): Promise<ActionResult<Application>>
// - Admin only
// - Sets status = HIRED, hiredAt = now
// - Creates ApplicationActivity("Candidate hired")

export async function addApplicationNote(
  applicationId: string,
  note: string
): Promise<ActionResult<ApplicationActivity>>
// - Admin, Manager, or hiring manager
// - Creates ApplicationActivity with action = "note"

export async function rateApplication(
  applicationId: string,
  rating: number
): Promise<ActionResult<Application>>
// - Admin or hiring manager
// - Updates application.rating (1-5)
```

### 4.4 Interview Actions

```typescript
// src/lib/actions/ats-interviews.ts
"use server";

export async function scheduleInterview(
  input: ScheduleInterviewInput
): Promise<ActionResult<Interview>>
// - Admin or hiring manager
// - Creates Interview + InterviewParticipant records
// - Creates ApplicationActivity("Interview scheduled")
// - Optionally sends email to candidate and interviewers
// - Revalidates /ats/interviews and /ats/jobs/[jobId]/applications/[appId]

export async function updateInterview(
  interviewId: string,
  data: Partial<UpdateInterviewInput>
): Promise<ActionResult<Interview>>
// - Admin or organizer
// - Updates interview details

export async function cancelInterview(
  interviewId: string,
  reason?: string
): Promise<ActionResult<Interview>>
// - Admin or organizer
// - Sets status = CANCELLED
// - Creates ApplicationActivity("Interview cancelled")

export async function submitInterviewFeedback(
  interviewId: string,
  feedback: string,
  rating: number
): Promise<ActionResult>
// - Interview participant only
// - Updates InterviewParticipant record with feedback and rating
// - Sets submittedAt = now
```

### 4.5 Evaluation Actions

```typescript
// src/lib/actions/ats-evaluations.ts
"use server";

export async function createCandidateEvaluation(
  applicationId: string,
  templateId?: string
): Promise<ActionResult<CandidateEvaluation>>
// - Admin, Manager, or assigned evaluator
// - Creates empty evaluation record for the current user
// - Uses job's evaluationTemplateId if templateId not provided

export async function saveEvaluationProgress(
  evaluationId: string,
  responses: EvaluationResponseInput[]
): Promise<ActionResult>
// - Evaluator only (must match evaluatorId)
// - Upserts EvaluationResponse records

export async function submitEvaluation(
  evaluationId: string,
  responses: EvaluationResponseInput[],
  overallRating: number,
  overallComment?: string,
  recommendation?: string
): Promise<ActionResult<CandidateEvaluation>>
// - Evaluator only
// - Validates all required questions answered
// - Creates/updates EvaluationResponse records
// - Sets submittedAt = now
// - Creates ApplicationActivity("Evaluation submitted by [name]")

export async function requestEvaluation(
  applicationId: string,
  evaluatorIds: string[]
): Promise<ActionResult>
// - Admin or hiring manager
// - Creates CandidateEvaluation records for each evaluator
// - Optionally sends notification emails
```

---

## 5. API Routes

Two API routes are needed for real-time operations that benefit from REST semantics over server actions:

### 5.1 Pipeline Drag-and-Drop

```
PATCH /api/ats/applications/[applicationId]/stage
```

File: `src/app/api/ats/applications/[applicationId]/stage/route.ts`

```typescript
// Body: { pipelineStageId: string }
// Returns: { success: boolean, application: Application }
```

This endpoint is used by the Kanban board for drag-and-drop. It needs to be a REST endpoint (not a server action) because:
- It is called from the `onDragEnd` handler in the client-side Kanban component
- Server actions require form submissions or `useTransition`, while this is a fire-and-forget optimistic update
- Faster response time for drag-and-drop UX

### 5.2 Candidate Resume Upload

```
POST /api/ats/candidates/[candidateId]/resume
```

File: `src/app/api/ats/candidates/[candidateId]/resume/route.ts`

```typescript
// Body: FormData with file
// Returns: { success: boolean, resumeUrl: string }
```

Handles file upload for candidate resumes. Stores in cloud storage (e.g., S3, Vercel Blob) and updates `Candidate.resumeUrl`.

### 5.3 ATS Analytics Data

```
GET /api/ats/analytics?jobId=...&period=...
```

File: `src/app/api/ats/analytics/route.ts`

```typescript
// Query params: jobId (optional), period (7d/30d/90d/all)
// Returns: { funnel, sourceBreakdown, timeToFill, hireRate }
```

Returns aggregated analytics data for charts. Separate API route to keep page components lean and allow client-side refetching with different filters.

---

## 6. Sidebar Navigation

### 6.1 Changes to `src/components/layout/sidebar.tsx`

Add the ATS section to the admin navigation items. Import the `Briefcase` icon from `lucide-react`:

```typescript
import {
  LayoutDashboard,
  Users,
  FileText,
  RotateCcw,
  ClipboardList,
  BarChart3,
  Settings,
  UsersRound,
  Briefcase, // NEW
} from "lucide-react";
```

Update `adminNavItems` to include ATS:

```typescript
const adminNavItems = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/people", icon: Users, label: "People" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/cycles", icon: RotateCcw, label: "Review Cycles" },
  { href: "/ats", icon: Briefcase, label: "Recruiting" },  // NEW
  { href: "/reports", icon: BarChart3, label: "Reports" },
];
```

For Managers who are hiring managers, add to `managerNavItems`:

```typescript
const managerNavItems = [
  { href: "/team", icon: UsersRound, label: "My Team" },
  { href: "/ats/jobs", icon: Briefcase, label: "My Positions" }, // NEW
];
```

The ATS item appears for admins in the main nav. For managers, it appears only in their supplementary section and links directly to `jobs` (their assigned positions). Employees do not see ATS in the sidebar at all — they would access internal job postings through a separate `/careers` or `/internal-jobs` page if desired in a future phase.

---

## 7. Public Job Board

Each company can have a branded, public-facing job board that lists their open positions and allows candidates to apply directly. The board can be integrated into the company's existing website via iframe embed or custom domain (DNS CNAME).

### 7.1 Access Methods

There are three ways a company's job board can be accessed:

| Method | URL | Use Case |
|--------|-----|----------|
| **Hosted (default)** | `app.peerhub.com/careers/acme` | Works immediately, no setup needed |
| **Iframe embed** | Company embeds `<iframe>` on their site | Quick integration, company keeps their domain |
| **Custom domain** | `careers.acme.com` → CNAME to `boards.peerhub.com` | Fully branded, seamless experience |

### 7.2 Route Structure

All public job board routes are **unauthenticated** — no login required. They live outside the `(dashboard)` route group:

```
src/app/(job-board)/careers/[companySlug]/
  layout.tsx                          — Branded layout (logo, colors, custom CSS)
  page.tsx                            — Job listings page
  [jobSlug]/
    page.tsx                          — Job detail + "Apply" button
    apply/
      page.tsx                        — Application form
    confirmation/
      page.tsx                        — "Application received" thank-you page
```

### 7.3 Page Descriptions

**`/careers/[companySlug]` — Job Listings**
- Hero section: company logo, cover image, title ("Careers at Acme"), description
- List of all OPEN positions grouped by department
- Each card: title, department, location, job type badge, work modality badge
- Search bar + filters: department, job type, work modality, location
- Responsive grid layout (cards on mobile, table on desktop)
- Company branding applied via CSS variables from `Company.jobBoardAccentColor` + `jobBoardCustomCss`

**`/careers/[companySlug]/[jobSlug]` — Job Detail**
- Full job description, requirements, responsibilities
- Sidebar: job type, work modality, location, salary range (if disclosed), department
- "Apply Now" CTA button
- "Share" button (copy link, LinkedIn, Twitter)
- Back link to all positions

**`/careers/[companySlug]/[jobSlug]/apply` — Application Form**
- Fields: first name, last name, email, phone (optional), LinkedIn URL (optional), resume upload, cover letter (optional)
- Source tracking: auto-detect `?ref=` query param (e.g., `?ref=linkedin`, `?ref=indeed`)
- Custom questions per job position (optional, from `JobPosition.customFields` config)
- CAPTCHA or honeypot to prevent spam
- Creates `Candidate` (upsert by companyId + email) and `Application` records
- Redirects to confirmation page on success

**`/careers/[companySlug]/[jobSlug]/confirmation` — Thank You Page**
- Confirmation message: "Thank you for applying!"
- Expected next steps / timeline
- Link back to all positions

### 7.4 Iframe Embed

Companies can embed their job board on any website using an iframe snippet. The dashboard settings page provides a copy-paste embed code.

**Embed code generated in settings:**
```html
<iframe
  src="https://app.peerhub.com/careers/acme?embed=true"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; max-width: 100%;"
  allow="clipboard-write"
  title="Acme Careers"
></iframe>
```

**Embed mode behavior (`?embed=true`):**
- Removes the job board header/footer (logo, hero) — only shows job listings
- Adds `target="_parent"` to links so navigation happens in the parent frame, OR keeps navigation within the iframe using a minimal header
- Sets `X-Frame-Options: ALLOWALL` and `Content-Security-Policy: frame-ancestors *` for this route only
- Optional: `?theme=light|dark` param to match the parent site
- Optional: `?accent=FF5733` param to override accent color from the parent site
- Responsive height via `postMessage` — the iframe sends its content height to the parent so the parent can auto-resize:

```javascript
// Inside iframe
window.parent.postMessage({ type: 'peerhub-resize', height: document.body.scrollHeight }, '*');
```

**Embed script (optional, better UX):**
```html
<script src="https://app.peerhub.com/embed.js" data-company="acme"></script>
<div id="peerhub-careers"></div>
```

This script creates the iframe dynamically, handles auto-resizing, and provides a cleaner integration.

### 7.5 Custom Domain (DNS CNAME)

Companies can point a subdomain (e.g., `careers.acme.com`) to their job board for a fully branded experience.

**Setup flow:**

1. **Admin configures custom domain** in dashboard settings (`/settings/job-board`)
   - Enters desired domain: `careers.acme.com`
   - System shows DNS instructions: "Add a CNAME record pointing `careers` to `boards.peerhub.com`"
   - System stores domain in `Company.jobBoardCustomDomain`

2. **DNS verification**
   - Cron job or on-demand check: resolve the CNAME and verify it points to `boards.peerhub.com`
   - Alternatively, use a TXT record verification: "Add a TXT record `_peerhub-verify.careers.acme.com` with value `peerhub-verify=<companyId>`"
   - Once verified, set `Company.jobBoardDomainVerified = true`

3. **SSL provisioning**
   - If deployed on Vercel: use Vercel's domain API (`POST /v10/projects/{projectId}/domains`) to add the custom domain. Vercel auto-provisions SSL via Let's Encrypt.
   - If self-hosted: use Caddy or Certbot for auto SSL.

4. **Request routing**
   - Next.js middleware (`src/middleware.ts`) intercepts requests:
     - Check `req.headers.host` against `Company.jobBoardCustomDomain`
     - If match found, rewrite to `/careers/[companySlug]` internally
     - The user sees `careers.acme.com` in the browser but Next.js serves `/careers/acme`

**Middleware logic:**
```typescript
// In src/middleware.ts
const host = req.headers.get("host");

// Skip if it's the main app domain
if (host !== "app.peerhub.com" && host !== "localhost:4999") {
  // Look up company by custom domain
  // Use an edge-compatible cache (e.g., Vercel KV) to avoid DB lookups on every request
  const companySlug = await getCompanySlugByDomain(host);
  if (companySlug) {
    const url = req.nextUrl.clone();
    url.pathname = `/careers/${companySlug}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
}
```

**Edge caching for domain lookups:**
- Cache the `customDomain → companySlug` mapping in Vercel KV or an in-memory LRU cache
- Invalidate when admin updates the custom domain in settings
- TTL: 5 minutes (short enough for changes, long enough for performance)

### 7.6 Job Board Settings (Dashboard)

New settings page: `/settings/job-board`

**Sections:**

1. **Branding**
   - Toggle: Enable/disable public job board
   - Title (defaults to "Careers at {companyName}")
   - Description (rich text)
   - Logo upload (overrides company logo for the board)
   - Cover/banner image upload
   - Accent color picker

2. **Integration**
   - **Hosted URL:** Read-only display of `app.peerhub.com/careers/{slug}`
   - **Embed code:** Copy-paste iframe snippet with preview
   - **Custom domain:**
     - Input field for domain
     - DNS instructions panel
     - Verification status badge (Pending / Verified / Failed)
     - "Verify Now" button to trigger on-demand check
   - **Advanced:** Custom CSS textarea for power users

3. **SEO**
   - Meta title, description (defaults from branding)
   - OG image (defaults from cover image)

### 7.7 Server Actions — Job Board

```typescript
// src/lib/actions/ats-job-board.ts
"use server";

export async function updateJobBoardSettings(
  data: UpdateJobBoardInput
): Promise<ActionResult<Company>>
// - Admin only
// - Updates Company branding fields
// - Revalidates /careers/[slug]

export async function setCustomDomain(
  domain: string
): Promise<ActionResult<{ domain: string; instructions: string }>>
// - Admin only
// - Validates domain format
// - Stores in Company.jobBoardCustomDomain
// - Returns DNS setup instructions

export async function verifyCustomDomain(
): Promise<ActionResult<{ verified: boolean }>>
// - Admin only
// - Checks DNS CNAME resolution
// - Updates Company.jobBoardDomainVerified
// - If on Vercel, calls Vercel API to add domain

export async function removeCustomDomain(
): Promise<ActionResult>
// - Admin only
// - Clears Company.jobBoardCustomDomain
// - If on Vercel, calls Vercel API to remove domain
```

### 7.8 Public API — Job Board Application

```
POST /api/careers/[companySlug]/[jobSlug]/apply
```

File: `src/app/api/careers/[companySlug]/[jobSlug]/apply/route.ts`

```typescript
// Body: FormData (firstName, lastName, email, phone?, linkedinUrl?, resume?, coverLetter?, ref?)
// Returns: { success: boolean, applicationId?: string }
// Rate limited: 5 applications per email per hour
// No auth required — public endpoint
// Creates Candidate (upsert) + Application + ApplicationActivity
```

### 7.9 SEO & Open Graph

Each job board page generates proper metadata for search engines and social sharing:

```typescript
// In /careers/[companySlug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const company = await getCompanyBySlug(params.companySlug);
  return {
    title: company.jobBoardTitle || `Careers at ${company.name}`,
    description: company.jobBoardDescription || `View open positions at ${company.name}`,
    openGraph: {
      images: [company.jobBoardCoverUrl || company.logo],
    },
  };
}

// In /careers/[companySlug]/[jobSlug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const job = await getJobBySlug(params.companySlug, params.jobSlug);
  return {
    title: `${job.title} — ${job.company.name}`,
    description: job.description?.slice(0, 160),
    openGraph: {
      type: "article",
      images: [job.company.jobBoardCoverUrl || job.company.logo],
    },
  };
}
```

Each job detail page also includes **JSON-LD structured data** (`JobPosting` schema) for Google Jobs indexing:

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Senior Software Engineer",
  "description": "...",
  "employmentType": "FULL_TIME",
  "jobLocationType": "TELECOMMUTE",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Acme Corp",
    "logo": "https://..."
  },
  "datePosted": "2026-03-01",
  "validThrough": "2026-06-01"
}
```

---

## 8. Implementation Phases

### Phase 1: Core Data Model + CRUD (Week 1-2)

**Goal:** Foundational schema, basic CRUD for jobs and candidates, navigation integration.

**Tasks:**

1. **Prisma Schema Updates**
   - File: `prisma/schema.prisma`
   - Add all new enums, models, and relation fields to existing models
   - Run `prisma migrate dev --name add_ats_module`

2. **Types**
   - File: `src/types/index.ts`
   - Add re-exports for all new Prisma types
   - Add extended types: `JobPositionWithRelations`, `CandidateWithApplications`, `ApplicationWithRelations`

3. **Permissions**
   - File: `src/lib/permissions/abilities.ts`
   - Add new resources and role permissions as detailed in Section 2

4. **Tenant Validation**
   - File: `src/lib/db/tenant.ts`
   - Add `"job_position" | "candidate" | "application"` to `validateResourceOwnership`

5. **Validations**
   - File: `src/lib/validations/ats.ts` (new)
   - Zod schemas: `createJobPositionSchema`, `updateJobPositionSchema`, `createCandidateSchema`, `updateCandidateSchema`, `createApplicationSchema`
   - File: `src/lib/validations/index.ts` — add `export * from "./ats"`

6. **Constants**
   - File: `src/lib/constants/ats-status.ts` (new)
   - Status labels, colors, and descriptions for `JobStatus`, `ApplicationStatus`, `InterviewStatus`
   - Default pipeline stages constant array
   - File: `src/lib/constants/index.ts` — add `export * from "./ats-status"`

7. **Server Actions - Jobs**
   - File: `src/lib/actions/ats-jobs.ts` (new)
   - Implement: `createJobPosition`, `updateJobPosition`, `publishJobPosition`, `closeJobPosition`
   - File: `src/lib/actions/index.ts` — add export

8. **Server Actions - Candidates**
   - File: `src/lib/actions/ats-candidates.ts` (new)
   - Implement: `createCandidate`, `updateCandidate`, `archiveCandidate`

9. **Server Actions - Applications**
   - File: `src/lib/actions/ats-applications.ts` (new)
   - Implement: `createApplication`, `rejectApplication`, `hireCandidate`

10. **Sidebar**
    - File: `src/components/layout/sidebar.tsx`
    - Add ATS nav items as described in Section 6

11. **Pages - Job Positions**
    - `src/app/(dashboard)/ats/page.tsx` — ATS dashboard
    - `src/app/(dashboard)/ats/jobs/page.tsx` — Jobs list
    - `src/app/(dashboard)/ats/jobs/new/page.tsx` — Create job form
    - `src/app/(dashboard)/ats/jobs/[id]/page.tsx` — Job detail (table view, Kanban comes in Phase 2)
    - `src/app/(dashboard)/ats/jobs/[id]/edit/page.tsx` — Edit job form

12. **Pages - Candidates**
    - `src/app/(dashboard)/ats/candidates/page.tsx` — Candidates table
    - `src/app/(dashboard)/ats/candidates/new/page.tsx` — Add candidate form
    - `src/app/(dashboard)/ats/candidates/[id]/page.tsx` — Candidate profile

13. **Components**
    - `src/components/ats/job-form.tsx` — Reusable job position form
    - `src/components/ats/job-card.tsx` — Job position card for list view
    - `src/components/ats/candidate-form.tsx` — Candidate creation/edit form
    - `src/components/ats/candidates-table.tsx` — Searchable candidates table
    - `src/components/ats/application-list.tsx` — Table view of applications per job

**Dependencies:** None (standalone phase)

---

### Phase 2: Pipeline Kanban + Application Management (Week 3-4)

**Goal:** Drag-and-drop Kanban board, application detail view, pipeline stage management.

**Tasks:**

1. **Install DnD Library** (optional)
   - Add `@hello-pangea/dnd` to dependencies, OR implement native HTML5 DnD

2. **API Route - Stage Update**
   - File: `src/app/api/ats/applications/[applicationId]/stage/route.ts`
   - PATCH handler for drag-and-drop stage changes

3. **Server Actions - Extended Application**
   - File: `src/lib/actions/ats-applications.ts`
   - Add: `moveApplicationToStage`, `addApplicationNote`, `rateApplication`, `withdrawApplication`

4. **Server Actions - Pipeline**
   - File: `src/lib/actions/ats-jobs.ts`
   - Add: `updatePipelineStages`, `duplicateJobPosition`

5. **Components - Kanban**
   - `src/components/ats/pipeline-kanban.tsx` — Main Kanban board component
   - `src/components/ats/application-card.tsx` — Draggable application card
   - `src/components/ats/pipeline-column.tsx` — Stage column wrapper
   - `src/components/ats/stage-editor.tsx` — Dialog/drawer for editing pipeline stages
   - `src/components/ats/application-detail-drawer.tsx` — Slide-over drawer with full app detail
   - `src/components/ats/activity-timeline.tsx` — Chronological activity feed

6. **Pages - Application Detail**
   - `src/app/(dashboard)/ats/jobs/[id]/applications/[applicationId]/page.tsx`

7. **Application Activity Tracking**
   - Ensure all state changes create `ApplicationActivity` records
   - Activity types: `stage_change`, `note_added`, `rating_changed`, `status_change`, `interview_scheduled`, `evaluation_submitted`

**Dependencies:** Phase 1 complete

---

### Phase 3: Interview Scheduling + Candidate Evaluations (Week 5-6)

**Goal:** Schedule interviews with multiple participants, structured candidate evaluations using the template system.

**Tasks:**

1. **Server Actions - Interviews**
   - File: `src/lib/actions/ats-interviews.ts` (new)
   - Implement all interview actions from Section 4.4

2. **Server Actions - Evaluations**
   - File: `src/lib/actions/ats-evaluations.ts` (new)
   - Implement all evaluation actions from Section 4.5

3. **Email Templates**
   - File: `src/lib/email/templates.ts`
   - Add: `sendInterviewInviteEmail`, `sendEvaluationRequestEmail`, `sendCandidateRejectionEmail`, `sendOfferEmail`

4. **Components - Interviews**
   - `src/components/ats/schedule-interview-dialog.tsx` — Dialog with date/time picker, type selector, participant selector
   - `src/components/ats/interview-card.tsx` — Interview summary card
   - `src/components/ats/interview-feedback-form.tsx` — Form for interviewers to submit feedback
   - `src/components/ats/interview-list.tsx` — List of interviews for a position/application

5. **Components - Evaluations**
   - `src/components/ats/evaluation-form.tsx` — Renders template questions (reuse pattern from `review-form.tsx`)
   - `src/components/ats/evaluation-summary.tsx` — Aggregated evaluation results for an application
   - `src/components/ats/evaluation-request-dialog.tsx` — Dialog to select evaluators and send requests

6. **Pages - Interviews**
   - `src/app/(dashboard)/ats/interviews/page.tsx` — All interviews calendar/list view

7. **Pages - Evaluations**
   - `src/app/(dashboard)/ats/evaluations/[applicationId]/page.tsx` — Evaluation form page

8. **Validations**
   - File: `src/lib/validations/ats.ts`
   - Add: `scheduleInterviewSchema`, `submitInterviewFeedbackSchema`, `submitEvaluationSchema`, `evaluationResponseSchema`

**Dependencies:** Phase 1 and 2 complete

---

### Phase 4: Reporting, Analytics + Polish (Week 7-8)

**Goal:** ATS analytics dashboard, hiring funnel reports, CSV export, search/filter enhancements, and polish.

**Tasks:**

1. **API Route - Analytics**
   - File: `src/app/api/ats/analytics/route.ts`
   - Aggregated metrics: time-to-fill, source effectiveness, stage conversion rates, hire rate

2. **Queries**
   - File: `src/lib/queries/ats-analytics.ts` (new)
   - `getATSDashboardStats(companyId)`: open positions, active candidates, upcoming interviews, hires this period
   - `getHiringFunnel(companyId, jobId?, period?)`: stage-by-stage conversion
   - `getSourceBreakdown(companyId, period?)`: applications by source
   - `getTimeToFill(companyId, period?)`: average days from open to hired
   - `getInterviewerLoad(companyId)`: interviews per team member

3. **Components - Analytics**
   - `src/components/ats/hiring-funnel-chart.tsx` — Bar/funnel chart using recharts
   - `src/components/ats/source-breakdown-chart.tsx` — Pie/donut chart
   - `src/components/ats/time-to-fill-chart.tsx` — Line chart over time
   - `src/components/ats/ats-stat-cards.tsx` — Summary stat cards for ATS dashboard

4. **ATS Dashboard Enhancement**
   - Update `src/app/(dashboard)/ats/page.tsx` with full analytics

5. **CSV/Export**
   - File: `src/app/api/ats/candidates/export/route.ts` — CSV export of candidate database
   - File: `src/app/api/ats/applications/export/route.ts` — CSV export of applications per job

6. **Resume Upload**
   - File: `src/app/api/ats/candidates/[candidateId]/resume/route.ts`
   - Integration with Vercel Blob or S3

7. **Search & Filters**
   - Full-text search on candidates (name, email, notes, tags)
   - Advanced filters on jobs page (status, department, date range)
   - Saved filter presets (optional)

8. **Template Category Enhancement** (optional)
   - Add optional `category` field to Template model to distinguish "Review" vs "Candidate Evaluation" templates
   - Filter template picker in job creation to show only evaluation templates

9. **Polish**
   - Loading skeletons for all pages (following existing `CyclesLoading` pattern)
   - Empty states for all lists (following existing `EmptyState` component pattern)
   - Responsive design for mobile/tablet
   - Keyboard shortcuts for Kanban (arrow keys to navigate)
   - Confirmation dialogs for destructive actions (reject, archive, delete)

**Dependencies:** Phase 1, 2, and 3 complete

---

### Phase 5: Public Job Board + Custom Domains (Week 9-10)

**Goal:** Branded public careers page per company, iframe embeddable, custom domain support with SSL.

**Tasks:**

1. **Prisma Schema — Job Board Fields**
   - File: `prisma/schema.prisma`
   - Add job board branding and custom domain fields to `Company` model
   - Run `prisma migrate dev --name add_job_board_fields`

2. **Route Group & Layout**
   - `src/app/(job-board)/careers/[companySlug]/layout.tsx` — Public layout with company branding (no auth, no sidebar)
   - Reads `Company` branding fields and injects CSS variables for accent color + custom CSS
   - Detects `?embed=true` and strips header/footer for iframe mode
   - Sets permissive `X-Frame-Options` and CSP headers for embed mode

3. **Pages — Job Board**
   - `src/app/(job-board)/careers/[companySlug]/page.tsx` — Job listings with hero, search, department grouping
   - `src/app/(job-board)/careers/[companySlug]/[jobSlug]/page.tsx` — Job detail with JSON-LD structured data
   - `src/app/(job-board)/careers/[companySlug]/[jobSlug]/apply/page.tsx` — Public application form
   - `src/app/(job-board)/careers/[companySlug]/[jobSlug]/confirmation/page.tsx` — Thank-you page

4. **Components — Job Board**
   - `src/components/job-board/job-board-header.tsx` — Branded header with logo, title, cover image
   - `src/components/job-board/job-listing-card.tsx` — Position card for the listings grid
   - `src/components/job-board/job-filters.tsx` — Search + filter bar (department, type, modality, location)
   - `src/components/job-board/public-application-form.tsx` — Form with resume upload, CAPTCHA
   - `src/components/job-board/job-detail-sidebar.tsx` — Metadata sidebar (type, location, salary)
   - `src/components/job-board/share-buttons.tsx` — Social share links

5. **Public API — Application Submission**
   - File: `src/app/api/careers/[companySlug]/[jobSlug]/apply/route.ts`
   - Handles FormData with resume upload
   - Rate limiting (5 per email per hour)
   - Creates Candidate (upsert) + Application + ApplicationActivity
   - Source tracking from `?ref=` query param

6. **Iframe Embed Support**
   - `public/embed.js` — Lightweight script that creates iframe, handles auto-resize via `postMessage`
   - Embed settings UI in `/settings/job-board` with copy-paste snippet

7. **Server Actions — Job Board Settings**
   - File: `src/lib/actions/ats-job-board.ts` (new)
   - Implement: `updateJobBoardSettings`, `setCustomDomain`, `verifyCustomDomain`, `removeCustomDomain`

8. **Custom Domain Support**
   - Middleware update: `src/middleware.ts` — detect custom domains, rewrite to `/careers/[slug]`
   - DNS verification logic (CNAME check or TXT record)
   - Vercel domain API integration for SSL provisioning (if on Vercel)
   - Edge cache for domain → slug mapping (Vercel KV or in-memory LRU)

9. **Dashboard Settings Page**
   - `src/app/(dashboard)/settings/job-board/page.tsx` — Branding, embed code, custom domain setup
   - `src/components/settings/job-board-settings-form.tsx` — Form with color picker, image uploads, CSS editor
   - `src/components/settings/domain-setup-panel.tsx` — Domain input, DNS instructions, verification status

10. **SEO & Metadata**
    - `generateMetadata` for all job board pages (title, description, OG image)
    - JSON-LD `JobPosting` schema on job detail pages for Google Jobs indexing
    - `robots.txt` and `sitemap.xml` generation for public job pages

11. **Validations**
    - File: `src/lib/validations/ats.ts`
    - Add: `publicApplicationSchema`, `updateJobBoardSettingsSchema`, `customDomainSchema`

**Dependencies:** Phase 1 complete (job positions must exist). Can run in parallel with Phase 2-4 for the basic board; custom domains can be added last.

---

## Appendix: New File Inventory

### Prisma
- `prisma/schema.prisma` — Modified (add enums, models, relations)
- `prisma/migrations/<timestamp>_add_ats_module/` — Generated migration

### Types
- `src/types/index.ts` — Modified (add ATS type exports)

### Permissions
- `src/lib/permissions/abilities.ts` — Modified (add ATS resources + contextual checks)

### Validations
- `src/lib/validations/ats.ts` — New
- `src/lib/validations/index.ts` — Modified (add ats export)

### Constants
- `src/lib/constants/ats-status.ts` — New
- `src/lib/constants/index.ts` — Modified (add ats-status export)

### Server Actions (all new)
- `src/lib/actions/ats-jobs.ts`
- `src/lib/actions/ats-candidates.ts`
- `src/lib/actions/ats-applications.ts`
- `src/lib/actions/ats-interviews.ts`
- `src/lib/actions/ats-evaluations.ts`
- `src/lib/actions/ats-job-board.ts`
- `src/lib/actions/index.ts` — Modified (add exports)

### API Routes (all new)
- `src/app/api/ats/applications/[applicationId]/stage/route.ts`
- `src/app/api/ats/candidates/[candidateId]/resume/route.ts`
- `src/app/api/ats/analytics/route.ts`
- `src/app/api/ats/candidates/export/route.ts`
- `src/app/api/ats/applications/export/route.ts`
- `src/app/api/careers/[companySlug]/[jobSlug]/apply/route.ts`

### Queries
- `src/lib/queries/ats-analytics.ts` — New

### Email Templates
- `src/lib/email/templates.ts` — Modified (add ATS email templates)

### Tenant
- `src/lib/db/tenant.ts` — Modified (add ATS resource types to validation)

### Layout
- `src/components/layout/sidebar.tsx` — Modified (add ATS nav items)

### Pages (all new)
- `src/app/(dashboard)/ats/page.tsx`
- `src/app/(dashboard)/ats/jobs/page.tsx`
- `src/app/(dashboard)/ats/jobs/new/page.tsx`
- `src/app/(dashboard)/ats/jobs/[id]/page.tsx`
- `src/app/(dashboard)/ats/jobs/[id]/edit/page.tsx`
- `src/app/(dashboard)/ats/jobs/[id]/applications/[applicationId]/page.tsx`
- `src/app/(dashboard)/ats/candidates/page.tsx`
- `src/app/(dashboard)/ats/candidates/new/page.tsx`
- `src/app/(dashboard)/ats/candidates/[id]/page.tsx`
- `src/app/(dashboard)/ats/candidates/[id]/edit/page.tsx`
- `src/app/(dashboard)/ats/interviews/page.tsx`
- `src/app/(dashboard)/ats/evaluations/[applicationId]/page.tsx`
- `src/app/(dashboard)/settings/job-board/page.tsx`
- `src/app/(job-board)/careers/[companySlug]/layout.tsx`
- `src/app/(job-board)/careers/[companySlug]/page.tsx`
- `src/app/(job-board)/careers/[companySlug]/[jobSlug]/page.tsx`
- `src/app/(job-board)/careers/[companySlug]/[jobSlug]/apply/page.tsx`
- `src/app/(job-board)/careers/[companySlug]/[jobSlug]/confirmation/page.tsx`

### Components (all new)
- `src/components/ats/job-form.tsx`
- `src/components/ats/job-card.tsx`
- `src/components/ats/candidate-form.tsx`
- `src/components/ats/candidates-table.tsx`
- `src/components/ats/application-list.tsx`
- `src/components/ats/application-card.tsx`
- `src/components/ats/application-detail-drawer.tsx`
- `src/components/ats/pipeline-kanban.tsx`
- `src/components/ats/pipeline-column.tsx`
- `src/components/ats/stage-editor.tsx`
- `src/components/ats/activity-timeline.tsx`
- `src/components/ats/schedule-interview-dialog.tsx`
- `src/components/ats/interview-card.tsx`
- `src/components/ats/interview-feedback-form.tsx`
- `src/components/ats/interview-list.tsx`
- `src/components/ats/evaluation-form.tsx`
- `src/components/ats/evaluation-summary.tsx`
- `src/components/ats/evaluation-request-dialog.tsx`
- `src/components/ats/hiring-funnel-chart.tsx`
- `src/components/ats/source-breakdown-chart.tsx`
- `src/components/ats/time-to-fill-chart.tsx`
- `src/components/ats/ats-stat-cards.tsx`

### Job Board Components (all new)
- `src/components/job-board/job-board-header.tsx`
- `src/components/job-board/job-listing-card.tsx`
- `src/components/job-board/job-filters.tsx`
- `src/components/job-board/public-application-form.tsx`
- `src/components/job-board/job-detail-sidebar.tsx`
- `src/components/job-board/share-buttons.tsx`

### Settings Components (new)
- `src/components/settings/job-board-settings-form.tsx`
- `src/components/settings/domain-setup-panel.tsx`

### Public Assets
- `public/embed.js` — Iframe embed script

### Middleware
- `src/middleware.ts` — Modified (add custom domain rewriting)

---

### Critical Files for Implementation
- `prisma/schema.prisma` — Foundation of the entire ATS module; all new models, enums, and relation additions go here
- `src/lib/permissions/abilities.ts` — Must be extended with 5 new ATS resources and contextual permission checks for hiring managers
- `src/lib/actions/cycles.ts` — Primary pattern reference for all new server actions (auth pattern, company scoping, ActionResult, revalidatePath)
- `src/app/(dashboard)/cycles/page.tsx` — Pattern reference for all new dashboard pages (server component, Suspense, data fetching, PageHeader, EmptyState)
- `src/components/layout/sidebar.tsx` — Must be modified to add ATS navigation items for admin and manager roles
