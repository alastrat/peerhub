# Migration Plan: Consulting Site → SaaS Platform

**Goal:** Move Kultiva's web presence from consulting-services positioning to SaaS platform positioning without losing SEO equity, breaking external links, or disrupting current traffic.

---

## 1. URL Redirect Map

All consulting-oriented pages get 301 (permanent) redirects to their closest platform equivalent. Next.js `next.config.js` `redirects()` handles these.

| Old URL | New URL | Reason |
|---|---|---|
| `/servicios` | `/plataforma` | Services section → platform overview |
| `/servicios/cultura` | `/modulos/encuestas-clima` | Cultura was climate/engagement work → Climate module |
| `/servicios/seleccion-especializada` | `/modulos/feedback-360` | Selection was competency-based → 360° module |
| `/servicios/cambio` | `/modulos/feedback-360` | Change mgmt was leadership feedback → 360° module |
| `/servicios/comunicacion-interna` | `/modulos/encuestas-clima` | Internal comms was climate-adjacent → Climate module |
| `/herramientas` | `/recursos` | Tools/resources renamed, positioning unchanged |
| `/conferencias` | `/nosotros` | Conferences were about founder → About page |
| `/diagnostico-clima` | Keep (repurpose) | Repurpose as free lead-gen tool for Climate module |

### i18n-aware redirects

Both locales need redirects. Example for `/servicios`:

```js
// next.config.js
async redirects() {
  return [
    { source: '/es/servicios', destination: '/es/plataforma', permanent: true },
    { source: '/en/servicios', destination: '/en/plataforma', permanent: true },
    { source: '/es/servicios/:slug', destination: '/es/modulos/:slug', permanent: true },
    // …etc
  ];
}
```

---

## 2. Pages to Delete

After redirects are in place and verified in production:

- `src/app/[locale]/(website)/servicios/page.tsx`
- `src/app/[locale]/(website)/servicios/[slug]/page.tsx`
- `src/app/[locale]/(website)/conferencias/page.tsx`
- `src/app/[locale]/(website)/herramientas/page.tsx` (optional: keep the route, swap content to new `/recursos`)

**Do not delete:**
- `/nosotros` — repositioned
- `/contacto` — kept as general contact
- `/blog`, `/blog/[slug]` — kept; evaluate renaming to `/recursos` vs keeping for SEO continuity (see Open Question §12.4)
- `/faq` — can be kept or folded into pricing/demo pages
- `/diagnostico-clima` — repurposed as lead-gen tool (Phase 2)

---

## 3. Pages to Create

All new pages live under `src/app/[locale]/(website)/`:

- `plataforma/page.tsx` — full platform overview
- `modulos/feedback-360/page.tsx`
- `modulos/encuestas-clima/page.tsx`
- `modulos/gestion-personas/page.tsx`
- `modulos/estructura-organizacional/page.tsx`
- `precios/page.tsx`
- `demo/page.tsx`
- `recursos/page.tsx` (if renaming `/blog`)

Homepage `/` and `/nosotros` get **rewritten in place**, not recreated.

---

## 4. Component Work

### New components needed

| Component | Used in | Notes |
|---|---|---|
| `PlatformHero` | `/` | Hero with dashboard mockup on right |
| `FeaturesGrid` | `/` | 4-module icon grid |
| `ProblemSolutionSection` | `/` | Two-column before/after |
| `HowItWorksSection` | `/` | 3-step visual |
| `CTABannerSection` | Multiple pages | Purple banner with dual CTAs |
| `PricingSection` | `/precios` | Tier cards + toggle |
| `ComparisonTable` | `/precios` | Feature comparison |
| `ModuleHero` | `/modulos/*` | Breadcrumb + badge + mockup |
| `ModuleCapabilities` | `/modulos/*` | 6-card grid for module features |
| `ProcessTimeline` | `/modulos/*` | Horizontal 5-step flow |
| `ComparisonBlock` | `/modulos/*` | Kultiva vs alternatives |
| `DemoRequestForm` | `/demo` | Form with server action |
| `PlatformHeader` | All pages | New nav with mega-dropdown |
| `PlatformFooter` | All pages | New 4-column footer |

### Existing components to reuse

- `Button`, `Card`, `AnimatedElement` — primitives
- `TestimonialSection` — for social proof on homepage (minor styling tweak)
- `ClientsSection` / `ClientsStrip` — for logo row on homepage
- `FAQSection` — for pricing/demo FAQ

### Deprecate

- `ServiceSection` (consulting-specific)
- `ProcessSection` (consulting-specific; replaced by `HowItWorksSection`)
- `AboutSection` (homepage variant, not `/nosotros` content)
- `CounterSection` (consulting-specific; stats move to `/nosotros`)
- `BlogSection` — evaluate; may be kept as "Recursos destacados" on homepage

---

## 5. Content Migration

### Translation file restructure

Current `src/messages/es.json` namespaces (inferred):
- `metadata`, `home`, `about`, `services`, `climate`, `conferences`, `tools`, `blog`, `contact`, `faq`, `navigation`, `footer`

New namespaces needed:
- `metadata` (update for platform positioning)
- `home` (full rewrite — platform-focused)
- `plataforma` (new)
- `modulos.feedback360` (new)
- `modulos.encuestasClima` (new)
- `modulos.gestionPersonas` (new)
- `modulos.estructuraOrganizacional` (new)
- `precios` (new)
- `nosotros` (rewrite)
- `demo` (new)
- `navigation` (update for new nav items)
- `footer` (update for new footer columns)

Deprecated namespaces (keep only if SEO-referenced pages remain):
- `services`, `conferences`, `tools`

### Sanity CMS

Keep existing content types (`blog`, `testimonials`, `clients`, `team`). Optional:
- Create new `heroSlide` entries focused on platform messaging (there's already a `heroSlide` schema per the audit).
- Add `caseStudy` type if we want dedicated case-study pages.

---

## 6. SEO Migration Checklist

- [ ] 301 redirect all deprecated URLs to new equivalents
- [ ] Update `sitemap.xml` to remove deprecated URLs, add new URLs
- [ ] Update `robots.txt` if any crawl rules reference deprecated paths
- [ ] Update Open Graph / Twitter card metadata for new platform positioning
- [ ] Submit new sitemap to Google Search Console
- [ ] Monitor 404s in Search Console for 2-4 weeks post-launch
- [ ] Update Google Business Profile and social profile descriptions to reflect platform positioning
- [ ] Update any paid ad destinations (Google Ads, LinkedIn) to new pages
- [ ] Verify canonical URLs on new pages
- [ ] Add structured data (JSON-LD) for SoftwareApplication on `/plataforma` and module pages

---

## 7. Analytics Migration

- Add events for new CTAs:
  - `demo_request_submit` — demo form submission
  - `pricing_view` — `/precios` page view
  - `module_view` — `/modulos/*` page view with `module` dimension
  - `cta_click` — track which CTAs drive conversions
- Update funnel definitions for new conversion path: Homepage → Plataforma/Precios → Demo
- Preserve historical data; annotate the launch date so traffic delta can be interpreted

---

## 8. Implementation Phasing

### Phase A — Planning review (current)
Duration: low. Await approval on strategy + specs.

### Phase B — Setup & infrastructure
- Create `redirects()` config with empty destinations (pointed at `/` until real pages exist)
- Set up translation namespaces stub structure
- Create layout/component directories under `src/components/bizzen/platform/`

### Phase C — Build core pages (first deployable wave)
Order:
1. Homepage (`/`) — highest impact
2. Plataforma (`/plataforma`) — needed for homepage CTA
3. Demo (`/demo`) — needed for every CTA on every page
4. Nosotros (`/nosotros`) — repositioning
5. Precios (`/precios`)

After this wave, the site can technically ship as a SaaS landing. Module detail pages are "nice-to-have" depth.

### Phase D — Module detail pages (second wave)
Order:
1. `/modulos/feedback-360` — template, build first
2. `/modulos/encuestas-clima`
3. `/modulos/gestion-personas`
4. `/modulos/estructura-organizacional`

### Phase E — Migration
1. Enable 301 redirects
2. Remove deprecated pages
3. Update sitemap + robots.txt
4. Push to production
5. Monitor Search Console for 2-4 weeks

### Phase F — Optimization
- Repurpose `/diagnostico-clima` as lead-gen tool
- A/B test homepage hero variations
- Iterate on pricing based on demo-request feedback

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SEO traffic loss from deprecated URLs | 301 redirects from day 1; monitor Search Console closely |
| Loss of consulting leads during transition | Keep `/contacto` functional, add Consulting-services copy as fallback section on `/nosotros` if needed |
| Pricing exposes us to undercutting by competitors | Keep pricing placeholder; confirm before launch |
| Current testimonials are consulting-specific | Refresh testimonials with platform-user quotes; use consulting testimonials only on `/nosotros` |
| Module pages over-commit on undelivered features | All copy references shipped features only — validated against feature catalog |
| Brand voice tonal shift | Preserve existing vocabulary (cultura, clima, liderazgo); layer product-focused language on top |

---

## 10. Rollback Plan

If post-launch traffic drops by >30% week-over-week on key pages:

1. Keep redirects in place (rolling back URLs would compound the damage)
2. Restore old page content temporarily under new URLs (e.g. `/servicios-legacy`) if specific landing pages were converting well
3. Audit new pages for clarity, speed, and conversion issues
4. Re-launch fixed versions after analysis

Do NOT remove redirects — keep them permanent. The fix is improving the new pages, not restoring the old URL structure.
