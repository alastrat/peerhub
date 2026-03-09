# Super Admin Settings — Implementation Plan

## 1. Architecture Overview

### Current State
- No `/settings` route exists yet. The sidebar and header link to `/settings` but no pages are implemented.
- `abilities.ts` already has a `settings` resource, and SUPER_ADMIN bypasses all permission checks.
- The session carries `session.user.globalRole` ("SUPER_ADMIN" | "USER") and `session.companyUser` (company-scoped role).
- The `SuperAdminDomain` table exists and is used in `auth/config.ts` to auto-assign SUPER_ADMIN on sign-up.

### Design Principle
A single `/settings` entry point with sub-routes. Sections displayed depend on user roles:

- **All users**: Profile (personal info)
- **Company ADMINs**: Company settings (name, branding, domain)
- **SUPER_ADMINs**: Platform-level sections (companies, users/global roles, admin domains, platform health)

SUPER_ADMIN sections appear seamlessly below standard sections in the settings nav.

---

## 2. Route Structure

```
/settings                          → redirect to /settings/profile
/settings/profile                  → Personal profile (all users)
/settings/company                  → Company settings (company ADMIN only)
/settings/platform/companies       → All companies list (SUPER_ADMIN only)
/settings/platform/users           → All users + global role mgmt (SUPER_ADMIN only)
/settings/platform/domains         → Super admin domains CRUD (SUPER_ADMIN only)
/settings/platform/health          → Platform overview/health stats (SUPER_ADMIN only)
```

---

## 3. Settings Layout & Navigation

### Layout (`src/app/(dashboard)/settings/layout.tsx`)

Server component that:
1. Calls `auth()` to get the session
2. Computes navigation items based on roles
3. Renders two-column layout: left nav + right content

### Navigation Items

| Section | Route | Icon | Visible To |
|---------|-------|------|------------|
| Profile | `/settings/profile` | User | All users |
| Company | `/settings/company` | Building2 | Company ADMIN, SUPER_ADMIN |
| — separator "Platform" — | | | |
| Companies | `/settings/platform/companies` | Building2 | SUPER_ADMIN |
| Users | `/settings/platform/users` | Users | SUPER_ADMIN |
| Admin Domains | `/settings/platform/domains` | Globe | SUPER_ADMIN |
| Platform Health | `/settings/platform/health` | Activity | SUPER_ADMIN |

### Nav Component (`src/components/settings/settings-nav.tsx`)

Client component receiving nav items as props. Uses `usePathname()` for active state.

---

## 4. Section Details

### 4.1 Profile Settings (`/settings/profile`)

**Access:** All authenticated users.

**UI:**
- Form: Name (text), Email (read-only), Profile image (avatar URL)
- Save button

**Server Action:** `updateProfile(data: { name?, image? })`
- Reads: `prisma.user.findUnique({ where: { id } })`
- Writes: `prisma.user.update({ where: { id }, data: { name, image } })`

---

### 4.2 Company Settings (`/settings/company`)

**Access:** `session.companyUser.role === "ADMIN"` or SUPER_ADMIN.

**UI:**
- **General**: Company name (editable), Slug (read-only), Domain (editable)
- **Branding**: Primary color picker, Logo URL
- **Danger Zone**: Delete company (SUPER_ADMIN only, typed confirmation)

**Server Actions:**
- Extend existing `updateCompany` to accept `domain`
- New `deleteCompany(companyId)` — SUPER_ADMIN only, cascading delete

---

### 4.3 Platform Companies (`/settings/platform/companies`)

**Access:** SUPER_ADMIN only.

**UI:**
- Stats row: Total Companies, Total Users, Active Cycles, Completed Reviews
- Searchable/sortable/paginated table:
  - Columns: Company Name, Slug, Users Count, Active Cycles, Created At
  - Search by name/slug, sort all columns, 10 per page
- Actions: Switch to Company, Edit, Delete (typed confirmation)
- "Create Company" button

**Queries:**
```
prisma.company.findMany({
  include: { _count: { select: { users: true } } },
  orderBy: { name: "asc" },
})
prisma.cycle.groupBy({ by: ['companyId'], where: { status: { in: ['IN_PROGRESS', 'NOMINATION'] } }, _count: true })
```

**Actions:**
- `createCompanyForPlatform(data: { name, slug })`
- `deleteCompany(companyId)` — cascade delete with SUPER_ADMIN guard

---

### 4.4 Platform Users (`/settings/platform/users`)

**Access:** SUPER_ADMIN only.

**UI:**
- Stats row: Total Users, Super Admins, Users with no company, New this month
- Searchable/sortable/paginated table:
  - Columns: Name, Email, Global Role (badge), Companies (count), Created At
  - Search by name/email, filter by global role, 10 per page
- Row actions:
  - **Toggle Global Role**: USER ↔ SUPER_ADMIN with confirmation dialog
  - **View Companies**: Expand showing CompanyUser records
  - **Delete User**: Typed confirmation, cascading delete

**Self-Protection (enforced server-side):**
- Cannot demote yourself from SUPER_ADMIN
- Cannot delete your own user account

**Server Actions:**
- `updateUserGlobalRole(userId, globalRole)` — SUPER_ADMIN only, not self
- `deletePlatformUser(userId)` — SUPER_ADMIN only, not self

---

### 4.5 Super Admin Domains (`/settings/platform/domains`)

**Access:** SUPER_ADMIN only.

**UI:**
- Info card explaining auto-assignment behavior
- Simple table: Domain, Created At, Delete action
- Inline add form with domain validation (no @, no spaces, must contain a dot)
- Delete with confirmation

**Validation:**
```
z.string().min(3).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/).transform(v => v.toLowerCase())
```

**Server Actions:**
- `getSuperAdminDomains()` — list all
- `addSuperAdminDomain(domain)` — validate + create
- `removeSuperAdminDomain(id)` — delete

**Future Enhancement:** "Sync Existing Users" button — find/promote users whose email matches a domain.

---

### 4.6 Platform Health (`/settings/platform/health`)

**Access:** SUPER_ADMIN only.

**UI:**
- Stats grid: Total Companies, Total Users, Active Cycles, Completed Reviews
- Companies ranked by user count (top 10)
- Cycle status distribution (DRAFT / NOMINATION / IN_PROGRESS / CLOSED / ARCHIVED)
- Recent activity feed (new users, companies, cycles — last 20 items)

**Queries:**
```
prisma.company.count()
prisma.user.count()
prisma.cycle.count({ where: { status: { in: ['IN_PROGRESS', 'NOMINATION'] } } })
prisma.reviewAssignment.count({ where: { status: 'COMPLETED' } })
prisma.company.findMany({ include: { _count: { select: { users: true } } }, orderBy: { users: { _count: 'desc' } }, take: 10 })
prisma.cycle.groupBy({ by: ['status'], _count: true })
```

---

## 5. Access Control

### Route-Level Guards
- `/settings/profile` — any authenticated user
- `/settings/company` — company ADMIN or SUPER_ADMIN
- `/settings/platform/*` — SUPER_ADMIN only
- Unauthorized → redirect to `/settings/profile`

### Action-Level Guards
Every platform server action verifies:
```
const session = await auth();
if (session?.user?.globalRole !== "SUPER_ADMIN") {
  return { success: false, error: "Unauthorized" };
}
```

### Dashboard Layout Fix
Currently redirects to `/onboarding` if `!session.companyUser`. Must change for SUPER_ADMIN:
- SUPER_ADMIN without company → redirect to `/settings/platform/health`
- Regular user without company → redirect to `/onboarding`

---

## 6. File Plan

### New Files

| File | Type | Purpose |
|------|------|---------|
| `src/app/(dashboard)/settings/layout.tsx` | Server component | Settings shell with side nav |
| `src/app/(dashboard)/settings/page.tsx` | Server component | Redirect to /settings/profile |
| `src/app/(dashboard)/settings/profile/page.tsx` | Server component | Profile editing |
| `src/app/(dashboard)/settings/company/page.tsx` | Server component | Company settings |
| `src/app/(dashboard)/settings/platform/companies/page.tsx` | Server component | Companies management |
| `src/app/(dashboard)/settings/platform/users/page.tsx` | Server component | Users & roles management |
| `src/app/(dashboard)/settings/platform/domains/page.tsx` | Server component | Domain CRUD |
| `src/app/(dashboard)/settings/platform/health/page.tsx` | Server component | Platform health dashboard |
| `src/components/settings/settings-nav.tsx` | Client component | Settings side navigation |
| `src/components/settings/companies-table.tsx` | Client component | Companies table |
| `src/components/settings/users-table.tsx` | Client component | Users table |
| `src/components/settings/role-toggle-dialog.tsx` | Client component | Role change confirmation |
| `src/components/settings/domain-form.tsx` | Client component | Add domain form |
| `src/components/settings/domains-list.tsx` | Client component | Domains list with actions |
| `src/lib/actions/settings.ts` | Server actions | Profile update |
| `src/lib/actions/platform.ts` | Server actions | All SUPER_ADMIN actions |
| `src/lib/queries/platform.ts` | Queries | Platform-level reads |
| `src/lib/validations/platform.ts` | Validation | Zod schemas |

### Modified Files

| File | Changes |
|------|---------|
| `src/app/(dashboard)/layout.tsx` | Adjust redirect for SUPER_ADMIN without company |
| `src/lib/actions/company.ts` | Add `domain` to `updateCompany`, add `deleteCompany` |
| `src/components/layout/sidebar.tsx` | SUPER_ADMIN visual indicator on settings icon |
| `src/components/layout/header.tsx` | Update PAGE_TITLES for settings sub-routes |

---

## 7. Implementation Order

1. **Settings shell** — layout, nav, redirect, profile page
2. **Company settings** — general, branding, danger zone
3. **Platform domains** — smallest scope, ties into existing `SuperAdminDomain`
4. **Platform users** — most critical admin feature
5. **Platform companies** — company management
6. **Platform health** — stats dashboard (nice-to-have)

---

## 8. Edge Cases

- **SUPER_ADMIN without company context**: Platform pages must NOT require `session.companyUser`
- **Self-protection**: Cannot demote/delete yourself (enforced server-side)
- **Cascading deletes**: Company deletion cascades to CompanyUser, Department, Template, Cycle, Invitation, ReviewToken
- **Audit trail** (future): Platform actions should be logged to a `PlatformAuditLog` table
