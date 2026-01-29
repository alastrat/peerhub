# PeerHub MVP - Implementation Plan

**Last Updated:** January 21, 2026

## Overview

This document details the complete implementation plan for finishing the PeerHub 360° Performance Evaluation MVP. It covers what's been built, what's missing, and step-by-step implementation guidance for each remaining feature.

---

## Development Environment

### Quick Start

```bash
# Start database (PostgreSQL on port 5433)
docker compose up -d

# Push schema and seed data
npx prisma db push
npm run db:seed

# Start dev server on port 4999
npm run dev -- -p 4999
```

### Services

| Service | Port | URL |
|---------|------|-----|
| **Next.js App** | 4999 | http://localhost:4999 |
| **PostgreSQL** | 5433 | `postgresql://postgres:postgres@localhost:5433/peerhub` |
| **MailHog SMTP** | 1025 | (for email testing) |
| **MailHog Web** | 8025 | http://localhost:8025 |

### Demo Accounts

| Email | Role | Password |
|-------|------|----------|
| `admin@acme.com` | Admin (HR Director) | Magic link |
| `sarah.eng@acme.com` | Manager (Engineering) | Magic link |
| `james.dev@acme.com` | Employee (Engineer) | Magic link |

**Login Process:**
1. Go to http://localhost:4999/login
2. Enter a demo email
3. Check terminal for magic link (EMAIL_DEV_MODE=true)
4. Open the URL from console

### Environment Files

- `.env` - Used by Prisma CLI
- `.env.local` - Used by Next.js

```env
# Database (port 5433 to avoid conflicts)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/peerhub?schema=public"

# NextAuth
AUTH_SECRET="dev-secret-change-in-production-minimum-32-chars"
AUTH_URL="http://localhost:4999"
NEXTAUTH_URL="http://localhost:4999"

# Email (dev mode logs to console)
EMAIL_DEV_MODE="true"
RESEND_API_KEY=""
EMAIL_FROM="PeerHub <noreply@peerhub.com>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:4999"
NEXT_PUBLIC_APP_NAME="PeerHub"
```

---

## Current State Summary

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.4 | Framework (App Router, Turbopack) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | Latest | UI components |
| Prisma | 6.x | ORM |
| PostgreSQL | 16 | Database |
| NextAuth | 4.x | Authentication |
| Zod | 4.x | Validation |
| React Hook Form | 7.x | Form handling |

### Completed Features (100%)

| Feature | Files | Description |
|---------|-------|-------------|
| **Templates** | `src/app/(dashboard)/templates/*`, `src/components/templates/*`, `src/lib/actions/templates.ts` | Full CRUD with section/question builder, duplicate, archive |
| **Review Cycles** | `src/app/(dashboard)/cycles/*`, `src/components/cycles/*`, `src/lib/actions/cycles.ts` | Wizard creation, participant management, launch/close workflow |
| **Design System** | `src/components/ui/*`, `src/components/design-system/*`, `src/styles/*` | shadcn/ui components, custom components, Tailwind config |
| **Permissions** | `src/lib/permissions/abilities.ts` | Role-based access control matrix |
| **Database Schema** | `prisma/schema.prisma` | Complete multi-tenant data model |
| **Seed Data** | `prisma/seed.ts` | Demo company with users, departments, templates, cycle |

### Mostly Complete (80-95%)

| Feature | Status | What Works | Missing |
|---------|--------|------------|---------|
| **Multi-tenancy & Auth** | 85% | Magic link login, Google OAuth config, session management, company creation | User invitation emails, company switching UI |
| **Organization (People)** | 95% | Employee CRUD, CSV import, manager assignment, profile pages | Department CRUD pages |
| **Reviews** | 85% | Review form, autosave draft, star ratings, submit flow | External rater route, autosave polling interval |

### Partially Complete (40-60%)

| Feature | Status | What Works | Missing |
|---------|--------|------------|---------|
| **Email Notifications** | 60% | Email templates defined, Resend integration, dev console logging | Wiring templates to server actions |
| **Nominations** | 40% | Database schema, validation, constants | UI pages, approval workflow |
| **Onboarding** | 40% | Company creation step | Multi-step wizard (employees, template, cycle) |

### Not Implemented (5-10%)

| Feature | Status | What Exists | Missing |
|---------|--------|-------------|---------|
| **Reports/Analytics** | 5% | Anonymity utility functions | All UI, aggregation queries, release flow |
| **HR Dashboards** | 10% | Basic overview page shell | Real data, analytics, participation tracking |

---

## Application Routes

### Implemented Routes

```
/                           # Landing page (marketing)
/login                      # Login with magic link/Google
/signup                     # Sign up (creates company)
/onboarding                 # Company setup
/overview                   # Dashboard home
/people                     # Employee list
/people/new                 # Add employee
/people/import              # CSV import
/people/[id]                # Employee profile
/people/[id]/edit           # Edit employee
/templates                  # Template list
/templates/new              # Create template
/templates/[id]             # Template detail
/templates/[id]/edit        # Edit template
/cycles                     # Cycle list
/cycles/new                 # Create cycle (wizard)
/cycles/[id]                # Cycle detail (tabs)
/my-reviews                 # Pending reviews list
/my-reviews/[id]            # Complete a review
/auth/error                 # Auth error page
/auth/verify-request        # Magic link sent page
/api/auth/[...nextauth]     # NextAuth API
/api/people/import          # CSV import API
```

### Missing Routes (To Implement)

```
# Reports
/reports                    # Cycle reports list
/reports/[cycleId]          # Cycle report management
/reports/[cycleId]/[userId] # Individual report view
/my-feedback                # Employee's released reports
/my-feedback/[cycleId]      # View own report

# Nominations
/nominations                # Nomination home
/nominations/[cycleId]      # Nominate peers
/nominations/[cycleId]/approve  # Approve nominations

# External
/external/review/[token]    # External rater review form

# Organization
/departments                # Department list
/departments/new            # Create department
/departments/[id]           # Department detail

# Analytics
/analytics                  # HR analytics dashboard

# API
/api/cron/send-reminders    # Email reminder cron
```

---

## Implementation Priority Order

1. **Reports & Analytics** - Critical for MVP (users need to see results)
2. **Nominations Workflow** - Required for peer review selection
3. **External Rater Route** - Enables external reviewers
4. **Email Integration** - Connects existing templates to actions
5. **HR Dashboards** - Admin analytics and tracking
6. **Department Management** - Organization structure
7. **Onboarding Improvements** - Better first-time experience

---

## Detailed Implementation Plans

---

### 1. Reports & Analytics

**Priority:** Critical
**Estimated Files:** 8-10 new files
**Dependencies:** Review responses must exist

#### 1.1 Data Layer

**File:** `src/lib/queries/reports.ts`

```typescript
// Functions to implement:
- getEmployeeReport(cycleId, companyUserId)
  // Aggregates all feedback for one employee
  // Uses anonymity threshold from cycle settings
  // Groups by reviewer type (self, manager, peers, direct reports)

- getCycleReportSummary(cycleId)
  // Overall cycle statistics
  // Completion rates by reviewer type
  // Average scores across all participants

- getReportReleaseStatus(cycleId)
  // Which reports have been released
  // Release timestamps
```

**Key Logic (from existing `src/lib/utils/anonymity.ts`):**
- `aggregateRatings()` - Averages ratings, respects threshold
- `aggregateTextResponses()` - Groups text, shuffles for anonymity
- `groupResponsesByReviewerType()` - Separates by SELF/MANAGER/PEER/etc.

#### 1.2 Server Actions

**File:** `src/lib/actions/reports.ts`

```typescript
// Actions to implement:
- releaseReport(cycleId, companyUserId)
  // Admin releases individual report
  // Sets releasedAt on CycleParticipant
  // Triggers notification email

- releaseAllReports(cycleId)
  // Batch release all reports for a cycle

- exportReportCSV(cycleId, options)
  // Generates CSV export
  // Options: aggregated only, include comments, etc.
```

#### 1.3 Pages & Components

**Route:** `src/app/(dashboard)/reports/page.tsx`
- List of cycles with reports
- Filter by status (released/unreleased)
- Link to cycle report management

**Route:** `src/app/(dashboard)/reports/[cycleId]/page.tsx`
- Cycle report overview
- List of participants with release status
- Bulk release controls
- Export button

**Route:** `src/app/(dashboard)/reports/[cycleId]/[userId]/page.tsx`
- Individual employee report view
- Sections matching template structure
- Rating visualizations (bar charts, radar charts)
- Text feedback sections (grouped, anonymized)
- Self vs Others comparison

**Components:**
```
src/components/reports/
├── report-header.tsx        # Employee info, cycle info, release status
├── rating-summary.tsx       # Overall scores visualization
├── section-results.tsx      # Per-section breakdown
├── rating-chart.tsx         # Bar/radar chart for ratings
├── text-feedback.tsx        # Grouped text responses
├── self-comparison.tsx      # Self vs aggregate comparison
├── release-controls.tsx     # Admin release buttons
└── export-dialog.tsx        # CSV export options
```

#### 1.4 Employee Report View

**Route:** `src/app/(dashboard)/my-feedback/page.tsx`
- List of released reports for current user
- Link to view each report

**Route:** `src/app/(dashboard)/my-feedback/[cycleId]/page.tsx`
- Employee views their own released report
- Same visualization as admin view
- No release controls

#### 1.5 Validation Schema

**File:** `src/lib/validations/report.ts`

```typescript
export const exportOptionsSchema = z.object({
  includeComments: z.boolean().default(true),
  includeRawScores: z.boolean().default(false),
  anonymizeNames: z.boolean().default(true),
});
```

---

### 2. Nominations Workflow

**Priority:** High
**Estimated Files:** 6-8 new files
**Dependencies:** Cycles must be in NOMINATION status

#### 2.1 Server Actions

**File:** `src/lib/actions/nominations.ts`

```typescript
// Actions to implement:
- createNomination(cycleId, nomineeId)
  // Employee nominates a peer
  // Validates against min/max peer settings
  // Creates PENDING nomination

- approveNomination(nominationId)
  // Manager/Admin approves
  // Updates status to APPROVED
  // Optionally auto-creates ReviewAssignment

- rejectNomination(nominationId, reason)
  // Manager/Admin rejects with reason
  // Updates status to REJECTED

- getNominationsForApproval(cycleId)
  // Gets pending nominations for manager's direct reports
  // Or all if admin

- getMyNominations(cycleId)
  // Gets nominations made by current user
```

#### 2.2 Pages & Components

**Route:** `src/app/(dashboard)/nominations/page.tsx`
- List of active cycles in nomination phase
- Link to nominate peers for each cycle

**Route:** `src/app/(dashboard)/nominations/[cycleId]/page.tsx`
- Employee view: Select peers to nominate
- Shows current nominations and their status
- Respects min/max peer limits

**Route:** `src/app/(dashboard)/nominations/[cycleId]/approve/page.tsx`
- Manager/Admin view: Approve/reject nominations
- Filter by status (pending/approved/rejected)
- Bulk approve option

**Components:**
```
src/components/nominations/
├── peer-selector.tsx        # Search/select peers to nominate
├── nomination-list.tsx      # List of nominations with status
├── nomination-card.tsx      # Individual nomination display
├── approval-actions.tsx     # Approve/reject buttons
└── nomination-stats.tsx     # Progress toward min/max
```

#### 2.3 Integration Points

- Update `launchCycle` to send nomination request emails
- Update cycle detail page to show nomination progress
- Add nomination tab to cycle detail page

---

### 3. External Rater Route

**Priority:** High
**Estimated Files:** 4-5 new files
**Dependencies:** ReviewToken must be created

#### 3.1 Token Generation Action

**Add to:** `src/lib/actions/cycles.ts`

```typescript
- addExternalRater(cycleId, revieweeId, email, name)
  // Creates ReviewAssignment with EXTERNAL type
  // Creates ReviewToken with secure token
  // Sends email with review link
  // Returns token for display (one-time)
```

#### 3.2 External Review Route

**Route:** `src/app/(external)/review/[token]/page.tsx`

```typescript
// Server component that:
// 1. Validates token (not expired, not used)
// 2. Fetches assignment and template
// 3. Renders review form (no auth required)

// Key differences from internal review:
// - No sidebar/header (minimal layout)
// - Token-based auth, not session
// - Uses submitTokenReview action
// - Shows success page after submission
```

**Layout:** `src/app/(external)/layout.tsx`
- Minimal layout without sidebar
- PeerHub branding
- No navigation

**Components:**
```
src/components/external/
├── external-review-form.tsx  # Review form for external raters
├── token-expired.tsx         # Error state for invalid/expired tokens
└── submission-success.tsx    # Thank you page after submission
```

#### 3.3 Admin UI for External Raters

**Add to cycle detail page:**
- "Add External Rater" button
- Modal to enter email, name, select reviewee
- List of external raters with token status

---

### 4. Email Integration

**Priority:** High
**Estimated Files:** Modify 4-5 existing files
**Dependencies:** Resend API key configured (or use EMAIL_DEV_MODE=true)

#### 4.1 Wire Up Existing Templates

**Modify:** `src/lib/actions/users.ts`

```typescript
// In inviteUser():
await sendInvitationEmail({
  email: data.email,
  inviterName: session.user.name,
  companyName: session.companyUser.companyName,
  inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?invitation=${invitation.id}`,
});
```

**Modify:** `src/lib/actions/cycles.ts`

```typescript
// In launchCycle():
// After creating assignments, send emails:
for (const assignment of newAssignments) {
  if (assignment.reviewerType !== 'SELF') {
    await sendReviewRequestEmail({
      reviewerEmail: assignment.reviewer.user.email,
      reviewerName: assignment.reviewer.user.name,
      revieweeName: assignment.reviewee.user.name,
      cycleName: cycle.name,
      dueDate: cycle.reviewEndDate,
      reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my-reviews/${assignment.id}`,
    });
  }
}
```

**Modify:** `src/lib/actions/reports.ts`

```typescript
// In releaseReport():
await sendReportReleasedEmail({
  employeeEmail: participant.user.email,
  employeeName: participant.user.name,
  cycleName: cycle.name,
  reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my-feedback/${cycleId}`,
});
```

#### 4.2 Reminder System

**New file:** `src/app/api/cron/send-reminders/route.ts`

```typescript
// Cron endpoint (can be called by Vercel Cron or external scheduler)
// Finds assignments that are:
// - Status: PENDING or IN_PROGRESS
// - Cycle reviewEndDate is within 3 days
// Sends reminder emails
```

---

### 5. HR Dashboards

**Priority:** Medium
**Estimated Files:** 5-6 new files
**Dependencies:** Cycles with data

#### 5.1 Data Queries

**File:** `src/lib/queries/dashboard.ts`

```typescript
- getDashboardStats(companyId)
  // Total employees, active cycles, pending reviews, etc.

- getCycleParticipation(cycleId)
  // Completion rates by reviewer type
  // Who hasn't started, in progress, completed

- getCompanyAnalytics(companyId, dateRange)
  // Historical data across cycles
  // Trends over time
```

#### 5.2 Update Overview Page

**Modify:** `src/app/(dashboard)/overview/page.tsx`

```typescript
// Replace hardcoded stats with real data:
const stats = await getDashboardStats(companyId);

// Add cycle completion widget
// Add recent activity feed
// Add quick actions for admins
```

#### 5.3 Analytics Page

**Route:** `src/app/(dashboard)/analytics/page.tsx`
- Participation trends over time
- Completion rate comparisons
- Response quality metrics

**Components:**
```
src/components/analytics/
├── participation-chart.tsx   # Line chart of completion over time
├── completion-breakdown.tsx  # By reviewer type
├── cycle-comparison.tsx      # Compare across cycles
└── date-range-picker.tsx     # Filter controls
```

---

### 6. Department Management

**Priority:** Medium
**Estimated Files:** 4-5 new files
**Dependencies:** None

#### 6.1 Server Actions

**File:** `src/lib/actions/departments.ts`

```typescript
- createDepartment(name, parentId?)
- updateDepartment(id, data)
- deleteDepartment(id)
  // Only if no employees assigned
- getDepartmentHierarchy(companyId)
  // Returns tree structure
```

#### 6.2 Pages

**Route:** `src/app/(dashboard)/departments/page.tsx`
- List/tree view of departments
- Employee count per department
- Add department button

**Route:** `src/app/(dashboard)/departments/new/page.tsx`
- Create department form
- Parent department selector

**Route:** `src/app/(dashboard)/departments/[id]/page.tsx`
- Department detail
- List of employees
- Edit/delete actions

---

### 7. Onboarding Improvements

**Priority:** Low
**Estimated Files:** 3-4 new files
**Dependencies:** None

#### 7.1 Multi-Step Wizard

**Modify:** `src/app/(onboarding)/onboarding/page.tsx`

Steps:
1. **Company Setup** (existing) - Name, slug
2. **Import Employees** - CSV upload or manual entry
3. **Create Template** - Use default or customize
4. **Setup First Cycle** - Quick cycle creation
5. **Complete** - Summary and next steps

**Components:**
```
src/components/onboarding/
├── onboarding-wizard.tsx     # Step controller
├── step-indicator.tsx        # Progress visualization
├── company-step.tsx          # Step 1
├── employees-step.tsx        # Step 2
├── template-step.tsx         # Step 3
├── cycle-step.tsx            # Step 4
└── complete-step.tsx         # Step 5
```

---

## File Structure Summary

### New Files to Create

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── reports/
│   │   │   ├── page.tsx                    # Report list
│   │   │   ├── [cycleId]/
│   │   │   │   ├── page.tsx                # Cycle reports
│   │   │   │   └── [userId]/
│   │   │   │       └── page.tsx            # Individual report
│   │   ├── my-feedback/
│   │   │   ├── page.tsx                    # My reports list
│   │   │   └── [cycleId]/
│   │   │       └── page.tsx                # View my report
│   │   ├── nominations/
│   │   │   ├── page.tsx                    # Nominations home
│   │   │   └── [cycleId]/
│   │   │       ├── page.tsx                # Nominate peers
│   │   │       └── approve/
│   │   │           └── page.tsx            # Approve nominations
│   │   ├── departments/
│   │   │   ├── page.tsx                    # Department list
│   │   │   ├── new/
│   │   │   │   └── page.tsx                # Create department
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Department detail
│   │   └── analytics/
│   │       └── page.tsx                    # Analytics dashboard
│   ├── (external)/
│   │   ├── layout.tsx                      # Minimal layout
│   │   └── review/
│   │       └── [token]/
│   │           └── page.tsx                # External review
│   └── api/
│       └── cron/
│           └── send-reminders/
│               └── route.ts                # Reminder cron
├── components/
│   ├── reports/                            # All report components (8 files)
│   ├── nominations/                        # All nomination components (5 files)
│   ├── external/                           # External rater components (3 files)
│   ├── analytics/                          # Analytics components (4 files)
│   └── onboarding/                         # Onboarding wizard (7 files)
└── lib/
    ├── actions/
    │   ├── reports.ts                      # Report actions
    │   ├── nominations.ts                  # Nomination actions
    │   └── departments.ts                  # Department actions
    ├── queries/
    │   ├── reports.ts                      # Report queries
    │   └── dashboard.ts                    # Dashboard queries
    └── validations/
        └── report.ts                       # Report schemas
```

### Files to Modify

```
src/lib/actions/users.ts          # Add email sending to inviteUser
src/lib/actions/cycles.ts         # Add email sending to launchCycle, add addExternalRater
src/app/(dashboard)/overview/page.tsx  # Replace hardcoded stats with real data
src/app/(dashboard)/cycles/[id]/page.tsx  # Add nomination tab, external rater UI
```

---

## Database Considerations

No schema changes required - all models exist:
- `Nomination` - For peer nominations
- `ReviewToken` - For external raters
- `CycleParticipant.releasedAt` - For report release tracking
- `ReviewResponse` - For storing feedback

---

## Testing Checklist

### Reports
- [ ] Admin can view cycle report overview
- [ ] Admin can release individual reports
- [ ] Admin can bulk release reports
- [ ] Employee can view their released report
- [ ] Employee cannot view unreleased report
- [ ] Anonymity threshold respected (< threshold hides group)
- [ ] Text responses shuffled
- [ ] CSV export works

### Nominations
- [ ] Employee can nominate peers during nomination phase
- [ ] Min/max peer limits enforced
- [ ] Manager can approve/reject nominations
- [ ] Admin can approve/reject any nomination
- [ ] Approved nominations create review assignments
- [ ] Rejection reason captured

### External Reviews
- [ ] Admin can add external rater
- [ ] Email sent with secure link
- [ ] External rater can access review via token
- [ ] Token expires after 14 days
- [ ] Token marked as used after submission
- [ ] Expired/used token shows error

### Emails
- [ ] Invitation email sent on user invite
- [ ] Review request email sent on cycle launch
- [ ] Report released email sent on release
- [ ] Reminder emails sent via cron

---

## Implementation Order (Recommended)

### Phase 1: Core Reports (Days 1-2)
1. `src/lib/queries/reports.ts`
2. `src/lib/actions/reports.ts`
3. `src/app/(dashboard)/reports/*` pages
4. `src/components/reports/*` components
5. `src/app/(dashboard)/my-feedback/*` pages

### Phase 2: Nominations (Days 3-4)
1. `src/lib/actions/nominations.ts`
2. `src/app/(dashboard)/nominations/*` pages
3. `src/components/nominations/*` components
4. Update cycle detail page

### Phase 3: External Reviews (Day 5)
1. Add `addExternalRater` action
2. `src/app/(external)/*` routes
3. `src/components/external/*` components
4. Update cycle detail page

### Phase 4: Email Integration (Day 6)
1. Wire emails in `users.ts`
2. Wire emails in `cycles.ts`
3. Wire emails in `reports.ts`
4. Create reminder cron endpoint

### Phase 5: Dashboards & Polish (Days 7-8)
1. Update overview page with real data
2. Create analytics page
3. Department management
4. Onboarding improvements

---

## Notes

- All new pages should follow existing patterns in the codebase
- Use existing components from `src/components/ui/*`
- Follow the permission checks pattern from `src/lib/permissions/abilities.ts`
- All server actions should validate tenant context using `getTenantContext()`
- Use `revalidatePath` after mutations
- Follow the `ActionResult<T>` return type pattern
- Use `zodResolver` with `as any` cast for form validation (Zod 4 compatibility)
