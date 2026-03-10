# Employee Model Refactor Plan

## Overview

Separate the current `CompanyUser` model (which conflates platform access and org-chart identity) into two distinct models:

- **`Employee`** — org chart entity (name, email, title, department, manager). No login required.
- **`CompanyUser` + `User`** — platform member with login access (billed seat). Optionally linked to an Employee.

Reviews, nominations, org chart, and cycle participation all reference `Employee`.

Employees with a linked `CompanyUser` use the full platform dashboard. Employees without platform access interact through an **Employee Portal** — a lightweight, magic-link-authenticated interface for nominations, reviews, and reports.

---

## New/Modified Models

### New: `Employee`
```prisma
model Employee {
  id           String   @id @default(cuid())
  companyId    String
  email        String
  name         String
  title        String?
  employeeCode String?       // formerly "employeeId" on CompanyUser
  managerId    String?
  departmentId String?
  startDate    DateTime?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company       Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  manager       Employee?    @relation("EmployeeManager", fields: [managerId], references: [id])
  directReports Employee[]   @relation("EmployeeManager")
  department    Department?  @relation(fields: [departmentId], references: [id])
  companyUser   CompanyUser?

  cycleParticipations CycleParticipant[]
  reviewsGiven        ReviewAssignment[] @relation("ReviewerAssignments")
  reviewsReceived     ReviewAssignment[] @relation("RevieweeAssignments")
  nominationsGiven    Nomination[]       @relation("NominatorRelation")
  nominationsReceived Nomination[]       @relation("NomineeRelation")
  nominationsFor      Nomination[]       @relation("RevieweeNominations")
  accessTokens        AccessToken[]

  @@unique([companyId, email])
  @@index([companyId])
  @@index([managerId])
  @@index([departmentId])
}
```

### New: `AccessToken` (magic links)
```prisma
model AccessToken {
  id         String             @id @default(cuid())
  token      String             @unique
  email      String
  companyId  String
  employeeId String?
  purpose    AccessTokenPurpose
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime           @default(now())

  company  Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employee Employee? @relation(fields: [employeeId], references: [id])

  @@index([token])
  @@index([email])
}

enum AccessTokenPurpose {
  EMPLOYEE_PORTAL    // General session — grants access to the Employee Portal
  COMPLETE_REVIEW    // Scoped — grants access to complete a specific review assignment
}
```

### Modified: `CompanyUser`
Remove org-chart fields. Add `employeeId` FK.

**Remove:** `title`, `employeeId` (string code), `managerId`, `departmentId`, `startDate`, manager/directReports/department relations, all review-system relations.

**Add:** `employeeId String? @unique` linking to Employee.

### Modified: `ReviewAssignment`
`reviewerId` and `revieweeId` reference `Employee` instead of `CompanyUser`.

### Modified: `CycleParticipant`
Rename `companyUserId` → `employeeId`, reference `Employee`.

### Modified: `Nomination`
`nominatorId`, `nomineeId`, `revieweeId` reference `Employee`.

### Modified: `Department`
`members` relation points to `Employee[]` instead of `CompanyUser[]`.

---

## Migration Strategy

**Key insight:** Use the same CUID from `CompanyUser.id` as `Employee.id`. This means all existing FK values in ReviewAssignment, CycleParticipant, Nomination already contain correct values — zero ID remapping needed.

### Step 1: Additive changes (no breakage)
- Create `Employee` table
- Create `AccessToken` table
- Add nullable `employeeId` FK to `CompanyUser`

### Step 2: Data migration script
```sql
INSERT INTO "Employee" (id, "companyId", email, name, title, "employeeCode", "managerId", "departmentId", "startDate", "isActive")
SELECT cu.id, cu."companyId", u.email, COALESCE(u.name, u.email), cu.title, cu."employeeId", cu."managerId", cu."departmentId", cu."startDate", cu."isActive"
FROM "CompanyUser" cu JOIN "User" u ON cu."userId" = u.id;

UPDATE "CompanyUser" SET "employeeId" = id;
```

### Step 3: Switch FK targets
- ReviewAssignment, CycleParticipant, Nomination, Department → reference Employee
- Rename `CycleParticipant.companyUserId` → `employeeId`

### Step 4: Remove old fields from CompanyUser

---

## Employee Portal (Token-Based Access)

Employees without a platform account interact through a lightweight **Employee Portal** — a dedicated area under `/portal` that requires no login, only a magic-link session.

### How it works

1. **Magic link request:** Employee visits `/portal` and enters their email. System sends a magic link with an `AccessToken` (`purpose: EMPLOYEE_PORTAL`, expires in 24h).
2. **Session:** Clicking the link sets a scoped cookie/JWT that identifies the Employee. This session grants access only to the portal — not the full platform dashboard.
3. **Portal home:** Shows the employee their pending actions:
   - Pending nominations (nominate peers for a cycle)
   - Pending reviews (complete assigned review forms)
   - Released reports (view their own feedback)
4. **Direct links:** System emails can also include direct links to specific actions (e.g., `/portal/review/{assignmentId}?token=...`), which authenticate and navigate in one click.

### Portal pages

| Route | Purpose | Module |
|-------|---------|--------|
| `/portal` | Email entry → magic link request | Core |
| `/portal/verify/[token]` | Token validation → set session cookie | Core |
| `/portal/home` | Dashboard with pending actions | Core |
| `/portal/nominations/[cycleId]` | Nominate peers for a cycle | 360 Feedback |
| `/portal/review/[assignmentId]` | Complete a review form | 360 Feedback |
| `/portal/reports/[cycleId]` | View own feedback report | 360 Feedback |
| `/portal/onboarding` | Onboarding checklist & tasks | Onboarding (future) |
| `/portal/surveys/[surveyId]` | Complete a climate/pulse survey | Clima Laboral (future) |

### Direct review tokens (no portal session needed)

For maximum simplicity, individual review assignments can still use scoped `COMPLETE_REVIEW` tokens:
- Generated when cycle launches for employees without CompanyUser
- One token per assignment, embedded in email link
- Employee clicks → lands directly on review form → submits → done
- No portal session required, no cookie set
- Existing `ReviewToken` model already supports this — `AccessToken` with `purpose: COMPLETE_REVIEW` is an alternative unified approach

### Member vs non-member notification logic

| Event | Employee with CompanyUser (member) | Employee without CompanyUser |
|-------|-------------------------------------|-------------------------------|
| Nomination phase opens | In-platform notification + email | Email with portal link |
| Review assigned | In-platform notification + email | Email with direct review link |
| Reminder for pending review | In-platform notification + email | Email with direct review link |
| Report released | In-platform notification + email | Email with portal link to report |
| Onboarding tasks (future) | In-platform notification + email | Email with portal link |
| Climate survey (future) | In-platform notification + email | Email with portal survey link |

### Security considerations

- Portal sessions are scoped: can only access data for the authenticated Employee
- Magic link tokens expire in 24h; portal session cookie expires in 7 days
- Direct review tokens expire with the cycle end date
- Rate-limit magic link requests to prevent email enumeration
- Portal session cannot escalate to full platform access

---

## Implementation Phases

### Phase 1: Schema & Data Migration
1. Add Employee model, AccessToken model, employeeId FK on CompanyUser
2. Rename `CompanyRole.EMPLOYEE` → `CompanyRole.MEMBER` in schema and all references (actions, components, seed data)
3. Run Prisma migration
4. Execute data migration script
5. Switch FK targets on ReviewAssignment, CycleParticipant, Nomination, Department
6. Remove old fields from CompanyUser
7. Run final migration

### Phase 2: Core Logic Layer
7. Update `src/types/index.ts` — new Employee types
8. Update `src/lib/auth/config.ts` — include `employeeId` when loading CompanyUser (single field, no session restructure)
9. Update `src/lib/db/tenant.ts` — add Employee to tenant context
10. Update `src/lib/validations/user.ts` — split into employee/member schemas

### Phase 3: Server Actions & Queries
11. Rewrite `src/lib/actions/users.ts` — split into employee + member actions
12. Rewrite `src/lib/actions/cycles.ts` — Employee references + token generation
13. Update `src/lib/actions/nominations.ts`
14. Update `src/lib/actions/reviews.ts`
15. Update `src/lib/actions/reports.ts`
16. Update `src/lib/actions/platform.ts`
17. Rewrite `src/lib/queries/reports.ts` and `dashboard.ts`
18. Rewrite `src/app/api/people/import/route.ts`
19. Update `src/app/api/cron/send-reminders/route.ts`

### Phase 4: UI Pages & Components
20. Update all dashboard pages (see file list below)
21. Update all components
22. Create magic-link report viewing page
23. Update onboarding page

### Phase 5: Employee Portal
24. Build portal core: `/portal` email entry, `/portal/verify/[token]` validation, session cookie management
25. Build `/portal/home` — pending actions dashboard
26. Build `/portal/review/[assignmentId]` — review form (reuse existing review form component)
27. Build `/portal/nominations/[cycleId]` — peer nomination (reuse existing nomination component)
28. Build `/portal/reports/[cycleId]` — feedback report view (reuse existing report components)

### Phase 6: Notification & Token Integration
29. Update `launchCycle` — generate direct review tokens for non-member employees, send portal links for nominations
30. Update `releaseReport` — send portal report links for non-member employees
31. Update `src/app/api/cron/send-reminders/route.ts` — use portal links for non-members
32. New email templates: magic link, portal nomination invite, portal review invite, portal report available

### Phase 7: Future Module Hooks (deferred)
33. `/portal/onboarding` — onboarding checklist (when Onboarding module is built)
34. `/portal/surveys/[surveyId]` — climate/pulse surveys (when Clima Laboral module is built)

---

## File Impact Summary

### New files (~10 files)
- `src/app/(portal)/portal/page.tsx` — email entry
- `src/app/(portal)/portal/verify/[token]/page.tsx` — token validation
- `src/app/(portal)/portal/home/page.tsx` — pending actions dashboard
- `src/app/(portal)/portal/review/[assignmentId]/page.tsx` — review form
- `src/app/(portal)/portal/nominations/[cycleId]/page.tsx` — peer nomination
- `src/app/(portal)/portal/reports/[cycleId]/page.tsx` — feedback report
- `src/app/(portal)/layout.tsx` — portal layout (minimal, no sidebar)
- `src/lib/auth/portal-session.ts` — portal cookie/JWT management
- `src/lib/actions/portal.ts` — server actions for portal (request magic link, validate token)
- `src/lib/email/templates/portal-*.ts` — portal email templates

### Major rewrites (~15 files)
- `prisma/schema.prisma`
- `src/types/index.ts`
- `src/lib/actions/users.ts`
- `src/lib/actions/cycles.ts`
- `src/lib/queries/reports.ts`
- `src/app/api/people/import/route.ts`
- `src/app/api/cron/send-reminders/route.ts`
- `src/app/(dashboard)/people/page.tsx`
- `src/app/(dashboard)/cycles/[id]/page.tsx`

### Moderate updates (~25 files)
- `src/lib/auth/config.ts`
- `src/lib/db/tenant.ts`
- `src/lib/actions/nominations.ts`, `reviews.ts`, `reports.ts`, `platform.ts`
- `src/lib/queries/dashboard.ts`
- `src/lib/validations/user.ts`
- `src/app/(dashboard)/overview/page.tsx`
- `src/app/(dashboard)/people/new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`
- `src/app/(dashboard)/my-reviews/page.tsx`, `[id]/page.tsx`
- `src/app/(dashboard)/my-feedback/[cycleId]/page.tsx`
- `src/app/(dashboard)/nominations/[cycleId]/page.tsx`, `approve/page.tsx`
- `src/app/(dashboard)/reports/[cycleId]/page.tsx`, `[userId]/page.tsx`
- `src/app/(dashboard)/settings/company/members/page.tsx`, `[memberId]/page.tsx`
- `src/components/settings/members-table.tsx`, `member-detail.tsx`
- `src/components/people/people-table.tsx`, `employee-form.tsx`
- `src/components/cycles/cycle-wizard.tsx`

### Minor updates (~15 files)
- `src/lib/actions/departments.ts`, `roles.ts`
- `src/lib/permissions/abilities.ts`
- `src/app/(dashboard)/cycles/new/page.tsx`
- `src/app/(dashboard)/settings/company/departments/page.tsx`
- Various components that receive already-flattened props

### No changes (~20 files)
- Chart components, static pages, company settings

---

## Challenges

1. **Session resolution is zero-cost.** The session callback already queries `CompanyUser` — just include `employeeId` as an additional field in the same query. Actions read `session.companyUser.employeeId` directly from the session, no extra DB call. Super admins without an Employee record have `employeeId: null` and simply can't call review-system actions — which is correct behavior.
2. **People page shows employees only.** Members are managed separately at `/settings/company/members`. On the People page, employees who are also members get a small icon + tooltip to indicate they have platform access.
3. **CompanyRole enum rename:** Rename `CompanyRole.EMPLOYEE` → `CompanyRole.MEMBER` as part of Phase 1 to avoid confusion with the new `Employee` model. Update all references: schema, server actions, UI components, seed data. The enum becomes `ADMIN | MANAGER | MEMBER`.
4. **Migration atomicity:** Run entire data migration in a transaction to avoid inconsistent FK state.
5. **Component reuse between dashboard and portal.** Portal pages for reviews, nominations, and reports should reuse the same form/display components used in the dashboard. Extract shared components (review form, nomination selector, report viewer) into `/src/components/shared/` so both `(dashboard)` and `(portal)` route groups can import them. The portal just wraps them in a simpler layout without the sidebar/header.
6. **Dual notification paths.** Every notification event must check `employee.companyUser` existence to decide: in-platform notification + email (member) vs email-only with portal/direct links (non-member). Centralize this in a `notifyEmployee()` utility that handles both paths.
