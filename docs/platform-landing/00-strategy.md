# Kultiva SaaS Platform Shift — Strategy & Planning

**Status:** Planning — awaiting approval before implementation
**Language:** Spanish (LATAM, Colombian tuteo) primary; English i18n maintained
**Goal:** Replatform website from consulting-services positioning to B2B SaaS product

---

## 1. Executive Summary

Kultiva is pivoting from an organizational-development consultancy to a SaaS platform for HR teams in Latin America. The website currently positions Kultiva as a services provider (Cultura, Selección, Comunicación, Cambio). It must now position Kultiva as a **software product** with 4 shipped modules:

- **Feedback 360°** — cycles, nominations, multi-reviewer evaluations, competency frameworks, report release controls
- **Encuestas de Clima** — CLIMATE / PULSE / eNPS with dimensions, templates, scope targeting
- **Gestión de Personas** — directory, CSV import, manager hierarchy
- **Estructura Organizacional** — Hubs (sedes), cross-department Teams, Departments

The shift affects **the entire website**, not just the homepage. This document covers strategy, sitemap, and per-page specs.

---

## 2. Target Personas

| Persona | Role | What they care about | Decision weight |
|---|---|---|---|
| **HR Leader** | VP/Director de Gestión Humana | Retention metrics, compliance (Colombian labor law mandates periodic clima surveys), ROI on talent programs, board-ready reports | Buyer |
| **People Ops Operator** | Coordinador(a) de Desarrollo Organizacional | Ease of use, bulk CSV onboarding, multi-city office support (Bogotá/Medellín/Cali hubs), Spanish-native UX | Evaluator / daily user |
| **Team Lead** | Gerente de área | Not getting spammed, mobile-friendly flows, understanding team results | Internal champion, retention signal |

---

## 3. Core Value Proposition

**ES:** "La plataforma todo-en-uno para medir clima, gestionar feedback 360° y desarrollar talento — diseñada para equipos de RR.HH. en Latinoamérica."

**EN:** "The all-in-one platform to measure climate, manage 360° feedback, and develop talent — built for HR teams in Latin America."

---

## 4. Key Differentiators

| # | Differentiator | Why it matters |
|---|---|---|
| 1 | **Nativo en español** | Not a translated US product. UI, templates, competency frameworks, and support built in Spanish first. |
| 2 | **Multi-location (Hubs)** | Maps to Colombian "sedes" (Bogotá, Medellín, etc.). Cross-department Teams reflect matrix structures in grupos empresariales. |
| 3 | **Clima + 360° integrados** | Most LATAM competitors sell these separately. Kultiva unifies in one tenant with shared org hierarchy. |
| 4 | **Umbrales de anonimato configurables** | Critical for Colombian labor culture; drives participation trust. |
| 5 | **Control de liberación de reportes** | HR decides when/who sees each report — not automatic. |
| 6 | **Precio justo para LATAM** | 40-60% of US competitor pricing (Lattice: $6-11 USD/emp/mo) at equivalent depth. |
| 7 | **De consultoría a plataforma** | Built-in best practices (survey templates, competency libraries, dimension frameworks) from 15+ years of consulting DNA. |

---

## 5. Conversion Strategy

**Primary: Book a Demo** (sales-assisted, for 50-500 employee companies)
**Secondary: 14-day free trial** (self-serve, for sub-50 employee long tail)
**Avoid:** pure freemium (attracts low-intent users, multi-tenant setup cost is non-trivial)

Justification: LATAM enterprise HR buyers still expect a human touchpoint before committing. Lattice and Culture Amp both gate behind demo-booking for this reason. Offering a free trial captures the SMB long tail that competitors miss.

### CTA Placement Pattern

| Location | CTA | Color |
|---|---|---|
| Header (sticky) | "Solicitar Demo" | Purple (#613171) filled |
| Hero above-fold | "Solicitar Demo" + "Ver la Plataforma" | Primary + secondary |
| After social proof | "Solicitar Demo" | Primary |
| End of each module preview | "Ver [Módulo] en detalle" | Contextual link |
| After pricing | "Agendar Demo" + "Hablar con Ventas" | Primary + secondary |
| Footer | Final "Solicitar Demo" | Primary |
| Mobile (after 50% scroll) | Sticky bottom banner "Solicitar Demo" | Primary only |

---

## 6. Current State — Page Classification

### KEEP (reposition as platform)

| URL | Current | New role |
|---|---|---|
| `/` | Consulting home | **Platform landing** |
| `/nosotros` | About consulting firm | **About — consultancy→platform origin story** |
| `/contacto` | Consulting contact form | **Demo request + support contact** |
| `/blog` + `/blog/[slug]` | Blog | **Resources hub (rename to `/recursos`)** |
| `/faq` | General FAQ | **Platform FAQ (or fold into pricing/demo pages)** |

### DEPRECATE (redirect with 301s)

| URL | Action |
|---|---|
| `/servicios` | 301 → `/plataforma` |
| `/servicios/[slug]` | 301 → `/modulos/{mapped}` (e.g. `cultura` → `/modulos/encuestas-clima`) |
| `/conferencias` | 301 → `/nosotros` or 410 Gone |
| `/herramientas` | 301 → `/recursos` |
| `/diagnostico-clima` | Repurpose as free lead-gen tool, link from Climate module page |

### NEW (add)

| URL | Purpose |
|---|---|
| `/plataforma` | Full platform overview (all 4 modules) |
| `/modulos/feedback-360` | 360° module deep-dive |
| `/modulos/encuestas-clima` | Climate module deep-dive |
| `/modulos/gestion-personas` | People Management deep-dive |
| `/modulos/estructura-organizacional` | Org hierarchy deep-dive |
| `/precios` | Pricing tiers + comparison table |
| `/demo` | Demo request form |

---

## 7. Proposed Sitemap

```
/                                    Platform homepage
/plataforma                          Full platform overview
/modulos/feedback-360                360° Feedback deep-dive
/modulos/encuestas-clima             Climate Surveys deep-dive
/modulos/gestion-personas            People Management deep-dive
/modulos/estructura-organizacional   Org Hierarchy deep-dive
/precios                             Pricing tiers + comparison
/recursos                            Blog/guides hub (renamed from /blog)
/recursos/[slug]                     Individual article/guide
/nosotros                            Company story, pivot narrative
/demo                                Demo booking form
/contacto                            General contact, support
/faq                                 FAQ (or fold into /precios, /demo)
/login                               Existing tenant login (already exists)
/signup                              Self-serve signup (already exists)

# Deprecated (301 redirects)
/servicios                      → /plataforma
/servicios/cultura              → /modulos/encuestas-clima
/servicios/seleccion            → /modulos/feedback-360
/servicios/cambio               → /modulos/feedback-360
/servicios/comunicacion         → /modulos/encuestas-clima
/conferencias                   → /nosotros (or 410)
/herramientas                   → /recursos
/diagnostico-clima              Keep, repurpose as lead-gen tool
```

---

## 8. Primary Navigation (Header)

```
[Kultiva Logo]  Plataforma ▾  Precios  Recursos  Nosotros     Iniciar Sesión  [Solicitar Demo]
                    │
                    ├── Feedback 360°        → /modulos/feedback-360
                    ├── Encuestas de Clima   → /modulos/encuestas-clima
                    ├── Gestión de Personas  → /modulos/gestion-personas
                    └── Estructura Org.      → /modulos/estructura-organizacional
```

6 items. Mega-dropdown pattern for "Plataforma" follows Lattice/Leapsome.

---

## 9. Footer Structure

| Plataforma | Recursos | Empresa | Legal |
|---|---|---|---|
| Feedback 360° | Blog | Nosotros | Términos de uso |
| Encuestas de Clima | Guías y playbooks | Contacto | Política de privacidad |
| Gestión de Personas | Centro de ayuda | Trabaja con nosotros | Protección de datos |
| Estructura Organizacional | API / Docs | Partners | Habeas Data |
| Precios | | Comunidad LATAM | |

Bottom bar: copyright, language toggle (ES/EN), social links (LinkedIn priority for B2B).

---

## 10. Brand Voice (inherited from current site, adapted)

Current brand voice characteristics to preserve:
- **Tone:** Professional yet approachable; aspirational without jargon
- **Vocabulary:** Business + organizational development (cultura, clima, liderazgo, transformación)
- **Formality:** Colombian tuteo — "tú/tu", not "usted"
- **Messaging pillars:** Transformation, evidence, human-centered, measurable results

Adjustments for platform positioning:
- Lead with product capabilities, not consultative services
- Quantify outcomes ("92% participación", "+35% engagement")
- Contrast with alternatives ("Excel/Google Forms agotan a tu equipo")
- Founder-centric messaging relocated to `/nosotros` only

---

## 11. Implementation Phases

### Phase 1 — Planning review ✋ (current phase)
- Review and approve this strategy doc
- Review per-page specs (see `01-homepage.md` through `06-demo.md`)
- Confirm pricing tiers, decide on trial vs demo-only
- Confirm redirect mapping

### Phase 2 — Content + IA (post-approval)
- Write final Spanish copy (polish what's in specs)
- Source/create visual assets (dashboard mockups, module screenshots, hero images)
- Confirm component library needs (dashboard mockup component, pricing table, module detail layout)

### Phase 3 — Component build
- New sections: `PlatformHero`, `FeaturesGrid`, `HowItWorks`, `SocialProof`, `CTABanner`, `PricingSection`, `ModuleDetailHero`, `DemoForm`, `ComparisonTable`
- Update: `Header` (new nav), `Footer` (new columns)
- Keep: existing component primitives (Button, Card, AnimatedElement)

### Phase 4 — Page build
- `/` homepage
- `/plataforma`
- `/precios`
- `/nosotros` (repositioned)
- `/demo`
- `/modulos/feedback-360` (then clone for other 3 modules)

### Phase 5 — Migration
- Set up 301 redirects
- Deprecate/remove consulting pages
- Update sitemap.xml + robots.txt
- i18n: add English translations for all new copy

### Phase 6 — QA + launch
- Test in both ES/EN
- Verify all CTAs land on correct pages
- Check mobile layouts
- Deploy

---

## 12. Open Questions for Approval

1. **Pricing model** — proposed $3/$5/custom USD per user/month. Confirm or propose alternative.
2. **Free trial** — include 14-day trial alongside demo, or demo-only?
3. **Consulting services** — fully deprecated, or kept as a separate vertical (e.g. `kultiva.com/consultoria`)?
4. **Blog/Resources** — rename `/blog` → `/recursos`, or keep `/blog` URL for SEO continuity?
5. **Diagnóstico-clima page** — repurpose as free lead-gen tool (anonymous mini-survey that captures email)?
6. **Module deep-dive pages** — build all 4 now, or start with just the Homepage + Plataforma + Pricing and add module pages in a second wave?
7. **Logos/social proof** — do we have permission to use BIS, Habitat de los Andes, Fintra, Marymount, AMCHAM logos on the landing?

---

## 13. File Map

Per-page specs live in separate files for readability:

- `01-homepage.md` — `/` homepage (sections, wireframe, Spanish copy)
- `02-plataforma.md` — `/plataforma` overview page
- `03-modulo-feedback-360.md` — `/modulos/feedback-360` deep-dive (template for other modules)
- `04-precios.md` — `/precios` pricing page
- `05-nosotros.md` — `/nosotros` about page (repositioned)
- `06-demo.md` — `/demo` demo request page
- `07-migration-plan.md` — URL redirects, deprecations, SEO migration

---

**Next step:** review this strategy and the per-page specs, then reply with answers to the open questions in §12. No code will be written until you approve.
