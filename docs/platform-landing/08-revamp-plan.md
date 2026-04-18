# Landing Page Revamp Plan — Performance + rphants Patterns + Real Product Showcase

**Status:** 🟡 Planning — awaiting approval

This document covers a second-pass refinement of the landing pages based on user feedback:
1. Site feels slow → remove AOS scroll-trigger animations
2. Adopt structural patterns from `rphants-website` while preserving Kultiva theme
3. Showcase real product screenshots (animated) instead of generic illustrations

---

## Part 1 — Remove AOS, Use Lighter Animations

### Why AOS is the culprit
AOS (Animate On Scroll) listens to scroll position via Intersection Observer, applies CSS transitions on every entry. Multiple sections per page × multiple data-aos elements = lots of paint work + a 200ms+ delay before each section appears. On scroll-heavy landings this creates a "stuttery, slow" feel.

### Recommendation
- **Remove AOS entirely** (not just disable on platform pages). The package + CSS file + provider all go.
- Replace with **CSS-only `slide-up-fade` keyframe** that fires once on mount via `animation-delay` (not on scroll). Snappier, no runtime observer, no jank.
- For richer interactions (staggered word-by-word, shared-element transitions), introduce **`motion`** (the lighter successor to Framer Motion) — only on hero sections that warrant it, not site-wide.

### Implementation
1. Remove `AOSProvider` wrapper from `src/app/[locale]/(website)/layout.tsx`
2. Strip all `data-aos="..."` and `data-aos-duration="..."` props from bizzen sections
3. Add a single `slide-up-fade` keyframe to `globals.css` with utility classes:
   ```css
   .anim-fade-up { animation: slideUpFade 0.6s ease-out both; }
   .anim-delay-100 { animation-delay: 100ms; }
   .anim-delay-200 { animation-delay: 200ms; }
   /* etc */
   ```
4. (Optional) Add `motion` package for the hero sections specifically

### Files affected
- `src/app/[locale]/(website)/layout.tsx` (remove `<AOSProvider>`)
- `src/components/bizzen/AOSProvider.tsx` (delete)
- All bizzen section components (~25 files) — strip `data-aos` props
- `src/styles/globals.css` (add CSS keyframe utilities)
- `package.json` (remove `aos`)

---

## Part 2 — Adopt rphants Patterns

rphants uses **Next.js 15 + `motion` (lightweight Framer successor) + Tailwind + a few canvas tricks**. Kultiva uses **Bizzen template (Bootstrap-style classes) + custom CSS variables**. We won't migrate to Tailwind; we'll cherry-pick patterns that work in our existing CSS architecture.

### Top 3 patterns to steal (in priority order)

#### 1. Gradient text clipping + canvas/SVG animated hero background
**What rphants does:** Hero h1 uses `bg-gradient-to-br from-purple-600 to-orange-500 bg-clip-text text-transparent` for headline. Behind it, a Conway's Game of Life canvas runs at low opacity as ambient background.

**For Kultiva:** Use `linear-gradient(135deg, #613171, #9CC445)` (Kultiva purple → green accent) as text fill on hero h1. Replace canvas with a lightweight animated SVG pattern (subtle floating org-chart nodes or a flowing dot grid) — no GSAP needed, just CSS keyframe transforms on SVG.

**Effort:** ~2h (CSS gradient text + SVG animation)

#### 2. Modal-expandable feature cards (CardCarousel)
**What rphants does:** Horizontal scroll carousel with image cards. Click a card → it expands into a modal showing more detail. Uses Motion `layoutId` for smooth shared-element transitions.

**For Kultiva:** Replace the static FeaturesGridSection with a horizontal-scrolling carousel of 4 module cards. Click a card → modal opens with screenshots + bullets + "Ver detalle →" CTA. Uses `motion` package's `layoutId`. Mobile-friendly.

**Effort:** ~6-8h (new component + Motion integration)

#### 3. Vertical timeline with dashed connector + gradient circular badges
**What rphants does:** ProcessSteps section uses a vertical line with dashed border, circular gradient badges (purple→orange) for each step.

**For Kultiva:** Refactor HowItWorksSection (currently 3 horizontal steps) into a vertical timeline for module pages, with circular badges in Kultiva purple. Pure CSS, no library.

**Effort:** ~2h

### Patterns to skip
- Game of Life canvas (overkill for HR brand)
- Word-by-word text generation effect (gimmicky for B2B)
- GSAP ScrollTrigger (we're removing scroll-triggered animations)
- Dark theme variants (Kultiva is light-only)

### Optional: introduce `motion` package
If we want the smooth shared-element transitions and subtle stagger, install `motion` (~30KB gzipped, much smaller than Framer Motion). Limited to hero + carousel sections. NOT site-wide.

---

## Part 3 — Real Product Showcase Strategy

### Recommendation: Hybrid approach

| Where | Approach | Why |
|---|---|---|
| **Homepage hero** | **CSS-animated real screenshots** (composite layered images with CSS transforms, fade between modules) | Lightweight (<500KB), realistic UI, ships in 1 day, easy to refresh |
| **Module detail pages** | **Short autoplay WebM/MP4 loops** (15-20s per module) | Authentic depth, acceptable for LATAM bandwidth (<2MB per video), shows real flows |
| **Try-before-demo (later)** | **Defer to Supademo or Arcade** post-launch | Adds monthly cost; need traffic to justify |

### What to capture

Per Agent B's dashboard audit, top 3 highest-ROI captures (ordered by value):

#### Capture #1 — Climate Surveys (most visual impact)
- Static: `/surveys/climate` (grid view) + `/surveys/climate/[id]/results` (NPS gauge + heatmaps)
- Why: Heatmaps are extremely compelling marketing visuals. The colored NPS gauge + dimension bar charts photograph beautifully.
- Use: Homepage hero left/right composite, full screenshot on `/modulos/encuestas-clima`

#### Capture #2 — 360° Cycle Lifecycle (depth story)
- Animated: `/surveys/360/new` (4-step wizard) → `/surveys/360/[id]` (detail dashboard)
- Why: Wizard shows ease of setup; detail dashboard shows depth of features
- Use: Short WebM loop on `/modulos/feedback-360`

#### Capture #3 — Analytics + Released Report (the outcome)
- Static: `/analytics` (stat cards + line chart) + `/reports/[cycleId]/[userId]` (report card)
- Why: Tells the "measure → deliver insights" story. Analytics is clean for hero size; report card is data-rich for detail page
- Use: Homepage social proof section + `/modulos/feedback-360` capability section

### How to capture

**For static screenshots:**
1. Run dev server with seed data (`npx prisma db seed && PORT=4999 npm run dev`)
2. Use Chrome DevTools → "Capture full size screenshot" at 1920x1080
3. Crop/composite in Figma or directly in CSS overlays
4. Save to `public/images/screenshots/{module}-{view}.png` as WebP for smaller size

**For video loops:**
1. Run dev server with seed data
2. Use macOS QuickTime (Cmd+Shift+5) or Tella for screen recording
3. Record the user flow, ~15-20s
4. Edit out cursor jitter; speed up to 1.25x for snappiness
5. Encode as WebM (VP9) + MP4 (H.264) fallback using ffmpeg
6. Target <2MB per file, save to `public/videos/{module}-demo.{webm,mp4}`
7. Use `<video autoplay muted loop playsinline>` with poster image

**Seed data:** `prisma/seed.ts` (547 lines) already creates 20+ employees across 5 departments + cycle/template fixtures. No mock data work needed.

---

## Part 4 — Implementation Order

### Phase 1 — Quick wins (priority)
1. Remove AOS (1-2h) — instant perceived performance improvement
2. Add CSS slide-up-fade utility (30min)
3. Capture & deploy 3 hero screenshots (2-3h)
4. Replace homepage hero stock illustration with real screenshot composite

### Phase 2 — Pattern adoption (medium effort)
5. Gradient text on hero H1 (15min)
6. Animated SVG hero background (1-2h)
7. Vertical timeline for module page how-it-works (2h)

### Phase 3 — Larger refactors (defer)
8. CardCarousel modal feature grid — replace FeaturesGrid (6-8h, requires `motion` package install)
9. WebM video loops for each of 4 module pages (~half day per module)
10. (Later) Supademo/Arcade interactive demo on `/demo` page

---

## Open Questions Before I Start

1. **Install `motion` package?** Adds ~30KB gzipped. Required for CardCarousel modal transitions. OK to add or stay vanilla CSS only?
2. **Hero gradient colors** — Kultiva purple (#613171) → green accent (#9CC445)? Or stay pure purple? rphants uses purple→orange (high contrast); Kultiva green→purple is more brand-aligned but lower contrast.
3. **Screenshots vs videos for hero** — Confirm we go with static screenshots (Phase 1) and add video loops only on module pages?
4. **Seed data state** — Should I run the seed first to make sure dashboard data looks good for screenshots, or do you have a dev tenant already populated?
5. **Capture mechanism** — Do you want me to capture screenshots myself via Chrome DevTools / Playwright (I can script this), or do you want to capture them and provide the image files?

---

## Files I'd Modify in Phase 1 (AOS removal + first screenshot)

- DELETE: `src/components/bizzen/AOSProvider.tsx`
- EDIT: `src/app/[locale]/(website)/layout.tsx` (remove provider)
- EDIT: `src/styles/globals.css` (add CSS animations)
- EDIT: ~25 bizzen section files (strip `data-aos` props) — can be done with sed
- EDIT: `src/components/bizzen/sections/PlatformHeroSection.tsx` (add real screenshot)
- ADD: `public/images/screenshots/climate-results.webp` (captured screenshot)
- EDIT: `package.json` (remove `aos` dep)

After Phase 1: site loads/feels noticeably faster + hero shows real product. We can decide on Phase 2/3 scope based on result.
