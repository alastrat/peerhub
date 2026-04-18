# Kultiva SaaS Platform Landing — Planning Docs

This directory contains the full planning for Kultiva's shift from consulting-services website to B2B SaaS platform positioning.

**Status:** ✅ Approved — implementation in progress

## Approved Decisions

1. **Pricing:** $3 / $5 / custom USD/user/month (Starter / Business / Enterprise)
2. **Free trial:** Demo-only, no free trial
3. **Consulting services:** Kept — `/servicios`, `/conferencias`, `/herramientas`, `/diagnostico-clima` all remain
4. **Blog URL:** Keep `/blog`
5. **Diagnóstico-clima:** Kept
6. **Scope:** Build all 10 pages (home rewrite, nosotros rewrite, plataforma, precios, demo, 4 module pages)
7. **Client logos:** OK to use
8. **Component reuse:** Reuse existing bizzen template components, preserve shapes/structs/colors (#613171 purple, `bizzen-*` CSS classes, theme system)

---

## Document Map

| # | File | Purpose |
|---|---|---|
| 00 | [`00-strategy.md`](./00-strategy.md) | Strategy, personas, value prop, sitemap, navigation, IA — **start here** |
| 01 | [`01-homepage.md`](./01-homepage.md) | Homepage (`/`) — spec + wireframe + Spanish copy |
| 02 | [`02-plataforma.md`](./02-plataforma.md) | Platform overview (`/plataforma`) |
| 03 | [`03-modulo-feedback-360.md`](./03-modulo-feedback-360.md) | 360° module deep-dive (template for other 3 modules) |
| 04 | [`04-precios.md`](./04-precios.md) | Pricing (`/precios`) with 3 tiers + comparison |
| 05 | [`05-nosotros.md`](./05-nosotros.md) | About (`/nosotros`) — repositioned for platform |
| 06 | [`06-demo.md`](./06-demo.md) | Demo request (`/demo`) with form spec |
| 07 | [`07-migration-plan.md`](./07-migration-plan.md) | URL redirects, component work, SEO, rollout phases |

---

## Summary of Work

**Total pages:** 8 (6 new + 2 rewrites)
- 6 new: `/plataforma`, `/precios`, `/demo`, `/modulos/{feedback-360, encuestas-clima, gestion-personas, estructura-organizacional}`
- 2 rewrites: `/` (homepage), `/nosotros`

**Deprecated pages (301 redirected):** 6
- `/servicios`, `/servicios/[4 slugs]`, `/conferencias`, `/herramientas`

**Kept:** 3
- `/contacto`, `/blog` (optionally renamed to `/recursos`), `/faq`

**New components:** 14 (see migration plan §4)

**Language:** Spanish primary (Colombian tuteo), English i18n maintained.

---

## Open Questions — Need User Input

Before implementation begins, confirm:

1. **Pricing model** — Starter $3 / Business $5 / Enterprise custom (USD/user/month). Approve or propose alternative.
2. **Free trial** — Include 14-day trial alongside demo, or demo-only?
3. **Consulting services** — Fully deprecated, or kept as separate vertical (e.g. `kultiva.com/consultoria`)?
4. **Blog URL** — Rename `/blog` → `/recursos`, or keep `/blog` for SEO continuity?
5. **Diagnóstico-clima** — Repurpose as free lead-gen tool (anonymous mini-survey with email capture)?
6. **Scope** — Build all 4 module pages in Phase C, or ship homepage + plataforma + pricing first and add module pages in a second wave?
7. **Logos** — Permission to use BIS, Habitat de los Andes, Fintra, Marymount, AMCHAM on landing?

---

## Next Actions

Once approved:
1. Review strategy doc (`00-strategy.md`)
2. Review per-page specs (01–06)
3. Review migration plan (07)
4. Answer open questions above
5. Approve scope and phasing

Then implementation begins per the phased plan in `07-migration-plan.md`.
