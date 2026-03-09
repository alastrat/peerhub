# Dashboard Redesign Plan — Kultiva Theme Alignment

**Created:** March 8, 2026

## Executive Summary

The dashboard currently uses generic shadcn/ui defaults (blue primary, white backgrounds, minimal styling) while the Kultiva landing page has an established warm, earthy design system. The strategy is to remap shadcn CSS variables to Kultiva values, then layer on refinements to the layout shell, design-system components, and shadcn variants. This maximizes visual impact with minimum code changes.

## Key Architectural Findings

1. **`src/styles/kultiva/theme.css` is never imported.** It defines all `--kultiva-*` CSS variables and utility classes (`.kultiva-card`, `.kultiva-btn`, etc.) but no import exists. The Tailwind `kultiva-*` color utilities reference these undefined variables — they resolve to nothing.
2. **`body { padding-top: 90px; }` in `overrides.css` applies globally** — it affects the dashboard too, not just the website. Must be scoped.
3. **shadcn CSS variables in `globals.css`** use `--primary: 217 100% 50%` (pure blue) — no relation to Kultiva's green/terracotta palette.
4. **All dashboard pages share the same 5 design-system components** (`PageHeader`, `StatCard`, `EmptyState`, `LoadingSpinner`, `Logo`) and the same shadcn primitives. Changing these cascades everywhere.
5. **Font variables are loaded but not used correctly.** Kanit, Plus Jakarta Sans, Quicksand are loaded but body uses Inter, and headings have no Kanit override.
6. **No mobile navigation exists.** The sidebar uses fixed positioning with no responsive breakpoint handling.

---

## Phase 1: Foundation Layer (CSS Variables + Fonts)
*Transforms the entire dashboard appearance with zero component file changes*

### 1.1 Import Kultiva theme.css
**File:** `src/app/layout.tsx`
- Add `import "@/styles/kultiva/theme.css"` before the theme-variant imports

### 1.2 Remap shadcn CSS variables to Kultiva palette
**File:** `src/app/globals.css`

| shadcn variable | Current | New (Kultiva) |
|---|---|---|
| `--background` | `0 0% 100%` | `40 30% 97%` (cream) |
| `--foreground` | `0 0% 9%` | `30 20% 12%` (ink) |
| `--primary` | `217 100% 50%` | `152 55% 30%` (forest green) |
| `--secondary` | `0 0% 96%` | `35 20% 92%` (sand) |
| `--muted-foreground` | `0 0% 45%` | `30 10% 70%` (stone) |
| `--border` | `0 0% 90%` | `35 15% 85%` |
| `--sidebar-background` | `0 0% 100%` | `30 20% 12%` (dark ink) |
| `--sidebar-foreground` | `0 0% 9%` | `40 30% 97%` (cream) |
| Chart colors | blue-based | Kultiva primary/secondary/accent |

Also add heading/body font rules:
- Body: `var(--font-jakarta)` (Plus Jakarta Sans)
- Headings: `var(--font-kanit)` (Kanit)

### 1.3 Scope body padding-top
**File:** `src/styles/kultiva/overrides.css`
- Change `body { padding-top: 90px; }` to `.website-layout { padding-top: 90px; }`
- Add `.website-layout` class to the website layout wrapper

### 1.4 Add dashboard utility classes
**File:** `src/app/globals.css`
- `.dashboard-card` — Kultiva hover lift (translateY -4px + shadow-lg)
- `.dashboard-icon-box` — 3rem icon box with primary/10 bg
- `.dashboard-subtitle` — uppercase with line prefix
- Update `.card-premium`, `.card-interactive`, `.text-gradient` to Kultiva colors

---

## Phase 2: Layout Shell (Sidebar + Header + Mobile Nav)
*Structural transformation of the dashboard chrome*

### 2.1 Redesign Sidebar
**File:** `src/components/layout/sidebar.tsx`
- Dark background (Kultiva ink)
- White text navigation with `hover:bg-white/10`
- Active state: `bg-kultiva-primary text-white` with left accent bar
- Responsive: hidden below `lg`, shown as overlay with backdrop on mobile

### 2.2 Add Mobile Navigation
**New File:** `src/components/layout/mobile-nav.tsx`
- Hamburger button (visible `lg:hidden`)
- Slide-out drawer overlay with backdrop blur
- Same nav items as desktop sidebar
- Auto-close on route change

### 2.3 Redesign Header
**File:** `src/components/layout/header.tsx`
- Height increase (h-16 → h-20)
- Add hamburger button on left (`lg:hidden`)
- Company name with `font-kanit font-semibold`
- Notification dot with `bg-kultiva-accent` (golden wheat)
- `shadow-sm` instead of just `border-b`

### 2.4 Update Dashboard Layout
**File:** `src/app/(dashboard)/layout.tsx`
- Mobile nav state management
- Responsive padding: `px-4 sm:px-6 lg:px-8`
- `max-w-7xl mx-auto` container
- Sidebar offset only on `lg:` and above

---

## Phase 3: Design System Components
*Cascades to every dashboard page automatically*

### 3.1 PageHeader — Kultiva typography, optional subtitle with line prefix, bottom accent
### 3.2 StatCard — Kultiva hover lift, larger icon box, Kanit font for values, top accent border
### 3.3 EmptyState — Kultiva sand bg, larger icon, Kanit title
### 3.4 Logo — Replace SVG placeholder with actual Kultiva logo, add `variant` prop (default/white)
### 3.5 LoadingSpinner — Kultiva primary color, logo in LoadingPage

---

## Phase 4: shadcn/ui Component Variants
*Every button, card, badge across the app updates*

### 4.1 Button — `rounded-xl`, `font-semibold`, `duration-300`, new `kultiva` variant (terracotta)
### 4.2 Card — `rounded-2xl`, `transition-all duration-300`, Kanit for CardTitle, larger padding
### 4.3 Badge — New Kultiva variant colors (secondary, accent), increased padding
### 4.4 Progress — `bg-kultiva-sand` track, explicit `rounded-full` indicator
### 4.5 Input — `bg-white` for contrast on cream bg, smoother focus transitions

---

## Phase 5: Dashboard Page Refinements
*Visual polish on highest-traffic pages*

### 5.1 Overview — AnimatedElement wrappers, Kultiva icon boxes for quick actions, accent-colored nomination alerts
### 5.2 Cycles — Kultiva hover lift on cards, remapped status badge colors
### 5.3 Templates — Card hover lift, colored top border accent
### 5.4 People — Avatar ring styling, subtle list hover
### 5.5 Analytics Charts — Kultiva palette for chart colors (green/terracotta/wheat/stone)

---

## Phase 6: Animation and Polish

### 6.1 AnimatedElement — Wrap stat cards, page headers, card lists with staggered fade-up animations (using existing `@/components/kultiva/ui/AnimatedElement`)
### 6.2 Smooth page transitions — Optional Framer Motion `AnimatePresence` on route change

---

## Implementation Order (Dependency-Based)

| Batch | Files | Risk |
|---|---|---|
| 1. Foundation | `layout.tsx` import, `globals.css` vars, `overrides.css` scope | Lowest — just CSS |
| 2. Layout Shell | `mobile-nav.tsx` (new), `sidebar.tsx`, `header.tsx`, `(dashboard)/layout.tsx` | Medium — structural |
| 3. Design System | `logo.tsx`, `page-header.tsx`, `stat-card.tsx`, `empty-state.tsx`, `loading-spinner.tsx` | Low — isolated |
| 4. shadcn Variants | `button.tsx`, `card.tsx`, `badge.tsx`, `progress.tsx`, `input.tsx` | Low — isolated |
| 5. Page Polish | Overview, cycles, templates, people, analytics charts | Lowest — cosmetic |
| 6. Animations | AnimatedElement wrappers, optional page transitions | Lowest — additive |

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | < 640px | Single column, sidebar hidden (hamburger), `px-4` |
| Tablet | 640-1023px | Two columns, sidebar still hidden, `px-6` |
| Desktop | 1024px+ | Sidebar visible (collapsible), `pl-64 px-8` |
| Wide | 1400px+ | `max-w-7xl mx-auto` prevents over-stretch |

## Risk Mitigation

1. CSS variable remapping is highest-impact, lowest-risk — all shadcn components already use `hsl(var(--primary))`.
2. Body `padding-top: 90px` scoping must be tested on both website and dashboard.
3. Sidebar redesign preserves `isCollapsed`/`onToggle` interface.
4. Kanit is wider than Inter — test heading overflow on sidebar labels and page headers.
5. Dark sidebar + light dropdowns — shadcn `bg-popover` will be white, should work fine.
