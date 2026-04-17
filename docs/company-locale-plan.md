# Plan: Company-Level Language Settings

**Status**: Planning — approved, not yet implemented
**Branch**: `feat/company-locale-settings`

## Overview

Add company-level language/locale settings so the platform defaults to Spanish and supports other languages. Only company admins and super admins can change the setting.

## Architecture: Cookie/Session-Based (No Route Changes)

Dashboard stays at `/(dashboard)/` — no `[locale]` prefix added. Locale comes from the `Company` model via the auth session. This avoids breaking existing routes, bookmarks, and proxy.ts.

## Implementation Plan

### 1. Database — Add `locale` to Company model

```prisma
model Company {
  // ... existing fields
  locale  String  @default("es")
}
```

- Type: `String` (not enum) — adding locales later needs no migration
- Default: `"es"` (Spanish)
- Migration: `ALTER TABLE "Company" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es'`
- Existing rows auto-receive `"es"`

### 2. Supported Locales — Single source of truth

Export `SUPPORTED_LOCALES` from `src/i18n/routing.ts`:

```ts
export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
```

Both routing config and server action validation import from here.

### 3. Server Action — `updateCompanyLocale`

File: `src/lib/actions/platform.ts`

- Signature: `updateCompanyLocale(locale: string): Promise<ActionResult>`
- Auth: `requireCompanyAdmin()` — ADMIN + SUPER_ADMIN only
- Validates locale against `SUPPORTED_LOCALES`
- Updates `prisma.company.update({ data: { locale } })`
- `revalidatePath("/settings/company")`

### 4. Session Extension

File: `src/lib/auth/config.ts`

- In session callback, add `company.locale` to the company select
- Store as `token.companyLocale` in JWT
- Surface as `session.companyUser.locale`
- Fallback: `company.locale ?? "es"`
- Extend `companyUser` type in `src/types/index.ts`

### 5. Dashboard i18n — NextIntlClientProvider

File: `src/app/(dashboard)/layout.tsx`

- Add `NextIntlClientProvider` wrapping children
- Resolve locale from session: `session?.companyUser?.locale ?? "es"`
- Import messages statically from `es.json` / `en.json`
- Add `dashboard.*` namespace inside existing message files

**Incremental migration**: pages opt-in to `useTranslations("dashboard.section")` one at a time. Unmigrated pages continue working with hardcoded strings.

### 6. Settings UI — Language Card

File: `src/app/(dashboard)/settings/company/page.tsx`

- Add "Language" card alongside existing company settings cards
- Pattern: `RadioGroup` (shadcn) with language rows
- Flow: Select → Save button → toast "Language updated" → `router.refresh()`
- Description: "Sets the default language for all members of this company"
- Super admin: also add language select to `FeaturesManager` component

### 7. Tests

- Test `updateCompanyLocale`: success, invalid locale, auth failure, DB error
- Test session extension: locale present in session
- Test fallback behavior: missing locale defaults to "es"

## Files Affected

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `locale` to Company |
| `src/i18n/routing.ts` | Export `SUPPORTED_LOCALES` |
| `src/lib/actions/platform.ts` | Add `updateCompanyLocale` |
| `src/lib/auth/config.ts` | Include locale in session |
| `src/types/index.ts` | Add `locale` to companyUser type |
| `src/app/(dashboard)/layout.tsx` | Add `NextIntlClientProvider` |
| `src/app/(dashboard)/settings/company/page.tsx` | Language card |
| `src/components/settings/features-manager.tsx` | Super admin locale select |
| `src/messages/{es,en}.json` | Add `dashboard` namespace |

## Build Sequence

1. Schema migration (`locale` field)
2. Export `SUPPORTED_LOCALES` from routing.ts
3. Server action (`updateCompanyLocale`)
4. Session extension (auth config + types)
5. Dashboard layout (`NextIntlClientProvider`)
6. Settings UI (company page card + features manager)
7. Add `dashboard.*` namespace to message files
8. Tests
