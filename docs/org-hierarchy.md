 Plan: Organizational Hierarchy (Hubs, Teams) & Evaluation Scoping                                                                                                                                                   
                                                                                                                                                                                                                   
 Context

 PeerHub currently has a flat organizational structure: Company → Departments + Employee manager hierarchy. There's no concept of business units/locations (hubs) or working groups (teams). Evaluations (360 and
 climate) can only be scoped company-wide, by department, or by manual selection.

 Problem: Companies need:
 1. Multi-location/business-unit support (hubs) — gated by feature flag for larger companies
 2. Teams that subdivide departments, with cross-department membership support
 3. Evaluations scoped at any organizational level with drill-down reporting

 Key insight: Hubs and Departments are parallel dimensions, not hierarchical. Teams are the bridge — they typically subdivide a department but can include members from any department.

 Data Model

 New Models

 Hub (business unit / location / branch) — feature-flagged
 ├── id, name, description?, address?
 ├── companyId (required)
 ├── isDefault (every company gets one)
 ├── isActive
 └── Relations: Company, Employee[] (primary hub), Team[]

 Team (working group — subdivides departments, supports cross-dept members)
 ├── id, name, description?
 ├── companyId (required)
 ├── hubId? (which location — null for virtual/distributed teams, only used when featureHubs enabled)
 ├── departmentId? (primary department — null for fully cross-functional teams)
 ├── isActive
 └── Relations: Company, Hub?, Department?, TeamMember[]

 TeamMember (many-to-many junction — employees can be in teams outside their department)
 ├── id, teamId, employeeId
 ├── role: TeamRole (LEAD | MEMBER)
 ├── joinedAt
 └── @@unique([teamId, employeeId])

 Cross-department membership: An employee belongs to one primary department (Employee.departmentId), but can be a TeamMember of any team regardless of that team's departmentId. For example:
 - Employee "Ana" is in the Marketing department
 - Team "Product Launch" belongs to the Product department
 - Ana is a MEMBER of "Product Launch" → she participates in that team's evaluations
 - Ana's primary department stays Marketing for org chart / reporting purposes

 Modified Models

 Employee — add:
   hubId String? → Hub (primary location, only relevant when featureHubs enabled)
   teamMemberships TeamMember[]
   @@index([hubId])

 Department — add:
   teams Team[] (teams that primarily belong to this department)

 Company — add:
   hubs Hub[]
   teams Team[]
   featureHubs Boolean @default(false)  ← NEW FEATURE FLAG

 SurveyTargetType enum — extend:
   ALL | HUB | DEPARTMENT | TEAM | CUSTOM

 Cycle — add:
   scope    SurveyTargetType @default(CUSTOM)
   scopeIds String[]

 Invitation — add:
   hubId String?

 New enum:
   TeamRole { LEAD, MEMBER }

 Feature Flag: featureHubs

 Multi-hub support is gated behind Company.featureHubs (default: false).

 ┌────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │  featureHubs   │                                                                                          Behavior                                                                                           │
 ├────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ false          │ 1 default hub auto-created but invisible in UI. No hub dropdown on employees. No "Hubs" in settings nav. Hub-scoped evaluation option hidden. Teams still work (just without hub            │
 │ (default)      │ assignment).                                                                                                                                                                                │
 ├────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
 │ true           │ Full hub management in Settings. Hub dropdown on employee forms. Hub column in people table. Hub-scoped evaluations available.                                                              │
 └────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

 This means:
 - Small companies never see hubs — they use departments + teams only
 - Large/multi-location companies enable the flag and get full hub support
 - The Hub model always exists in the DB (default hub for every company), but the UI is gated

 Why This Design

 - Teams subdivide departments: A "Sales" department can have "Enterprise Sales", "SMB Sales", "Inbound Sales" teams
 - Cross-department membership: Any employee can join any team via TeamMember, regardless of their primary department. The team's departmentId indicates its primary affiliation, not a membership restriction.
 - Hubs are optional complexity: Feature-flagged so small companies never deal with location management
 - Employee → one hub, one department, many teams: Primary affiliation is simple; cross-cutting participation is via team membership
 - Evaluation scoping reuses SurveyTargetType: One enum for both 360 cycles and climate surveys

 Migration Strategy

 Migration 1 — Schema changes (additive, all nullable):
 - Create Hub, Team, TeamMember tables + TeamRole enum
 - Add hubId to Employee and Invitation
 - Add featureHubs Boolean to Company (default false)
 - Add HUB/TEAM to SurveyTargetType enum
 - Add scope/scopeIds to Cycle with defaults (CUSTOM, [])

 Migration 2 — Data migration (SQL):
 - Create default hub for every existing company
 - Assign all existing employees to their company's default hub

 Implementation Phases

 Phase 1: Schema & Migration

 Files:
 - prisma/schema.prisma — All model changes above
 - Migration SQL — Default hub creation + employee assignment

 Phase 2: Hub Management (feature-flagged CRUD + Settings UI)

 New files:
 - src/lib/actions/hubs.ts — CRUD following departments.ts pattern
 - src/lib/validations/hub.ts — Zod schemas
 - src/app/(dashboard)/settings/company/hubs/page.tsx — Settings page (guard: redirect if !featureHubs)
 - src/components/settings/hubs-manager.tsx — Client component

 Modified files:
 - src/lib/actions/company.ts — Auto-create default hub in createCompany
 - src/lib/db/tenant.ts — Auto-create default hub in createCompanyWithAdmin, add hub/team to validateResourceOwnership
 - src/components/settings/settings-nav.tsx — Conditionally show "Hubs" nav item only when featureHubs is enabled

 Phase 3: Team Management (CRUD + Membership UI)

 Teams are always available (not feature-flagged). Members can be from any department.

 New files:
 - src/lib/actions/teams.ts — CRUD + membership management. Key: addTeamMembers does NOT validate employee.departmentId matches team.departmentId (cross-dept allowed)
 - src/lib/validations/team.ts — Zod schemas
 - src/app/(dashboard)/settings/company/teams/page.tsx — Settings page
 - src/components/settings/teams-manager.tsx — Client component with member management. Member picker shows all company employees with their department as a label/badge so admins can see cross-dept additions.

 Modified files:
 - src/components/settings/settings-nav.tsx — Add "Teams" nav item (always visible)

 Phase 4: Employee Updates

 Modified files:
 - src/components/people/employee-form.tsx — Conditionally add hub dropdown (only when featureHubs enabled, passed as prop)
 - src/components/people/edit-employee-form.tsx — Same conditional hub dropdown
 - src/app/(dashboard)/people/new/page.tsx — Fetch hubs + featureHubs flag, pass to form
 - src/app/(dashboard)/people/[id]/edit/page.tsx — Same
 - src/app/(dashboard)/people/[id]/page.tsx — Show team memberships (with department badge per team)
 - src/components/people/people-table.tsx — Conditionally add hub column when featureHubs enabled
 - src/app/(dashboard)/people/page.tsx — Include hub in query, pass featureHubs flag
 - src/lib/actions/users.ts — Add hubId to create/update (assign default hub if not specified)
 - src/lib/validations/user.ts — Add hubId field
 - src/components/people/csv-import-wizard.tsx — Conditionally add hub column when featureHubs enabled

 Phase 5: Evaluation Scoping

 Modified files:
 - src/lib/actions/climate-distribution.ts — Add HUB/TEAM resolution branches. HUB branch only available when featureHubs enabled. TEAM branch resolves ALL TeamMembers regardless of their primary department
 (cross-dept inclusion).
 - src/lib/actions/cycles.ts — Add scope/scopeIds, auto-resolve participants. Same cross-dept team resolution.
 - src/lib/validations/cycle.ts — Add scope/scopeIds to Zod schema
 - src/components/cycles/cycle-wizard.tsx — Scope selector in participants step. Hub option conditionally shown based on featureHubs.
 - src/components/climate/survey-wizard.tsx — Scope selector in distribution step. Same conditional hub option.
 - src/app/(dashboard)/surveys/360/new/page.tsx — Fetch hubs (if featureHubs), teams for scope picker

 Phase 6: Report Aggregation

 Modified files:
 - src/lib/queries/climate-reports.ts — Add hub/team breakdowns. Hub breakdown only populated when featureHubs enabled.
 - src/lib/queries/reports.ts — Add getCycleReportByScope() function
 - src/app/(dashboard)/surveys/climate/[id]/results/page.tsx — Hub heatmap (conditional) + team heatmap
 - src/app/(dashboard)/reports/[cycleId]/page.tsx — Organizational breakdown tabs (Hub tab conditional)

 Cross-Department Team Example

 Acme Corp (featureHubs: false)
 ├── Department: Sales
 │   ├── Team: Enterprise Sales
 │   │   ├── Member: Carlos (Sales dept) — LEAD
 │   │   ├── Member: Ana (Sales dept)
 │   │   └── Member: Luis (Marketing dept) ← cross-dept member
 │   └── Team: SMB Sales
 │       └── ...
 ├── Department: Marketing
 │   └── Team: Product Launch
 │       ├── Member: Diana (Marketing dept) — LEAD
 │       ├── Member: Ana (Sales dept) ← cross-dept member
 │       └── Member: Pedro (Engineering dept) ← cross-dept member
 └── Department: Engineering
     └── Team: Platform
         └── ...

 When evaluating "Product Launch" team → includes Diana, Ana, AND Pedro, even though they're from 3 different departments.

 Testing & Verification

 Unit/Integration Tests

 - tests/integration/actions/hubs.test.ts — Hub CRUD, default hub protection, auto-creation, featureHubs guard
 - tests/integration/actions/teams.test.ts — Team CRUD, membership add/remove, cross-dept membership, role changes
 - Extend tests/helpers/mock-prisma.ts — Add hub, team, teamMember models

 Manual Verification

 1. Create a company → verify default hub auto-created, featureHubs=false
 2. Verify hubs section NOT visible in settings when featureHubs=false
 3. Enable featureHubs → verify hubs section appears, can create/edit/delete
 4. Settings > Teams → create team under Sales dept, add member from Marketing dept (cross-dept)
 5. People > New Employee → hub dropdown only shown when featureHubs=true
 6. Create 360 cycle scoped to a team → verify all members included regardless of their department
 7. Create climate survey targeting a team → verify cross-dept members receive it
 8. View reports → verify team breakdown includes cross-dept members correctly
 9. When featureHubs=false → verify no hub-related UI anywhere (settings, people, evaluation scope, reports)

 Parallelization

 - Phase 2 (Hubs) and Phase 3 (Teams) can run in parallel after Phase 1
 - Phase 4 can start once Phase 2 is done (needs hub dropdown)
 - Phase 5 requires Phase 2 + 3
 - Phase 6 requires Phase 5