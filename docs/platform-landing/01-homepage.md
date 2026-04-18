# Page Spec: Homepage (`/`)

**Purpose:** Capture attention, communicate core value proposition, drive to demo request or platform exploration.

**Primary CTA:** Solicitar Demo Gratis → `/demo`
**Secondary CTA:** Ver la Plataforma → `/plataforma`

---

## Sections

| # | Section | Component | Goal |
|---|---|---|---|
| 1 | Hero | `PlatformHero` | Headline + value prop + 2 CTAs + dashboard mockup |
| 2 | Logos strip | `ClientsStrip` | Immediate social proof |
| 3 | Problem/Solution | `ProblemSolution` | Connect with buyer pain, present Kultiva as answer |
| 4 | Features Grid (4 modules) | `FeaturesGrid` | Quick overview of 4 modules with icons |
| 5 | How It Works | `HowItWorks` | 3 visual steps: Configura, Lanza, Actúa |
| 6 | Social Proof | `TestimonialSection` (existing) | 2-4 quotes with metrics |
| 7 | CTA Banner | `CTABanner` | Closing demo CTA |

---

## Wireframe

```
+--------------------------------------------------------------+
|  [Kultiva]  Plataforma▾  Precios  Recursos  Nosotros         |
|                                    Iniciar Sesión [Demo]     |
+==============================================================+
|                                                              |
|  Badge: PLATAFORMA DE GESTIÓN DE TALENTO                     |
|                                                              |
|  Desarrolla a tu equipo con       ┌─────────────────────┐   |
|  datos, no con suposiciones       │  ┌─── Dashboard ───┐│   |
|                                   │  │ Q1 2026 Review  ││   |
|  Subtítulo de 2 líneas            │  │ 92%  4.2  87%   ││   |
|  explicando la plataforma.        │  │ ▂▃▅▆▇▆▅▃▂       ││   |
|                                   │  │ ▃▅▇▇▇▅▃         ││   |
|  [Solicitar Demo]  [Ver la        │  └─────────────────┘│   |
|   Plataforma]                     └─────────────────────┘   |
|                                                              |
|  Confían en nosotros:  [BIS] [Habitat] [Fintra] [Marymount]  |
+==============================================================+
|                                                              |
|      El problema que resolvemos                              |
|                                                              |
|  ┌──────────────────┐         ┌──────────────────┐          |
|  │ ✗ Encuestas en   │    →    │ ✓ Una plataforma │          |
|  │   Excel/Forms    │         │   que centraliza │          |
|  │ ✗ Feedback sin   │         │   feedback,clima │          |
|  │   seguimiento    │         │   y gestión      │          |
|  │ ✗ Datos dispersos│         │ ✓ Reportes listos│          |
|  │ ✗ Semanas de     │         │   para decisiones│          |
|  │   trabajo manual │         │ ✓ En minutos, no │          |
|  │                  │         │   en semanas     │          |
|  └──────────────────┘         └──────────────────┘          |
+==============================================================+
|            Todo lo que necesitas para gestionar talento      |
|                                                              |
|  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          |
|  │  [👥↔]       │  │  [💓]       │  │  [👤⚙]      │          |
|  │ Feedback    │  │ Encuestas   │  │ Gestión de  │          |
|  │ 360°        │  │ de Clima    │  │ Personas    │          |
|  │             │  │             │  │             │          |
|  │ Ciclos con  │  │ CLIMATE,    │  │ Directorio, │          |
|  │ multiples   │  │ PULSE, eNPS │  │ carga CSV,  │          |
|  │ evaluadores │  │             │  │ jerarquías  │          |
|  └─────────────┘  └─────────────┘  └─────────────┘          |
|  ┌─────────────┐                                             |
|  │  [🏢]       │                                             |
|  │ Estructura  │                                             |
|  │ Org.        │                                             |
|  │             │                                             |
|  │ Hubs,depts, │                                             |
|  │ equipos     │                                             |
|  └─────────────┘                                             |
+==============================================================+
|            En tres pasos, estás listo                        |
|                                                              |
|     ①                ②                 ③                     |
|   [🚀]             [🔄]              [📊]                    |
|  Configura   ─→  Lanza        ─→   Actúa                     |
|  tu cuenta en    ciclos de          con reportes             |
|  minutos         feedback o         claros por               |
|                  clima              persona/equipo           |
+==============================================================+
|            Resultados que hablan por sí solos                |
|                                                              |
|  ┌────────────────────────┐  ┌────────────────────────┐     |
|  │   92%                  │  │   +35%                 │     |
|  │   participación en     │  │   mejora en            │     |
|  │   feedback             │  │   engagement           │     |
|  │                        │  │                        │     |
|  │   "Antes no pasábamos  │  │   "Actuamos rápido y   │     |
|  │   del 60%."            │  │   el impacto fue       │     |
|  │                        │  │   inmediato."          │     |
|  │   — María C.           │  │   — Narly H.           │     |
|  │     Gerente RRHH, BIS  │  │     RRHH, Habitat      │     |
|  └────────────────────────┘  └────────────────────────┘     |
+==============================================================+
|                                                              |
|  ██████████ CTA BANNER (purple #613171) ██████████           |
|  █                                                  █        |
|  █  Transforma la gestión de talento de tu empresa  █        |
|  █                                                  █        |
|  █   [Agendar Demo Gratis]   [Ver Precios]          █        |
|  █                                                  █        |
|  ████████████████████████████████████████████████████        |
|                                                              |
+==============================================================+
|  Footer: Plataforma | Recursos | Empresa | Legal             |
|          Copyright · ES/EN toggle · [LinkedIn]               |
+--------------------------------------------------------------+
```

---

## Spanish Copy

### Hero
- **Badge:** `Plataforma de Gestión de Talento para LATAM`
- **H1:** `Desarrolla a tu equipo con datos, no con suposiciones`
- **Subtítulo:** `Kultiva centraliza feedback 360°, encuestas de clima, gestión de personas y estructura organizacional en una sola plataforma diseñada para la realidad de Latinoamérica.`
- **CTA primario:** `Solicitar Demo Gratis` → `/demo`
- **CTA secundario:** `Ver la Plataforma` → `/plataforma`
- **Trust line:** `Confían en nosotros:`

### Problem/Solution
- **H2:** `El problema que resolvemos`
- **Problema (column L):**
  - `Encuestas en Excel y Google Forms`
  - `Feedback sin seguimiento`
  - `Datos de personas dispersos entre hojas de cálculo`
  - `Semanas de trabajo manual por cada ciclo`
  - **Subtexto:** `Tu equipo de talento humano invierte más tiempo recopilando información que actuando sobre ella.`
- **Solución (column R):**
  - `Una plataforma que centraliza feedback, clima y gestión`
  - `Reportes listos para tomar decisiones`
  - `Configuración en minutos, no en semanas`
  - `Trazabilidad completa de cada ciclo`
  - **Subtexto:** `Kultiva concentra evaluaciones, encuestas y datos de personas en un solo lugar.`

### Features Grid
- **H2:** `Todo lo que necesitas para gestionar talento`
- **Subtítulo:** `Cuatro módulos integrados que se adaptan a tu organización.`

| # | Título | Icon | Descripción (1-2 líneas) | Link |
|---|---|---|---|---|
| 1 | **Feedback 360°** | `fa-people-arrows` | Ciclos de evaluación con múltiples evaluadores, competencias configurables y reportes individuales. Anonimato garantizado. | `/modulos/feedback-360` |
| 2 | **Encuestas de Clima** | `fa-heart-pulse` | Clima, Pulso y eNPS. Plantillas listas, dimensiones personalizables y segmentación por sede, departamento o equipo. | `/modulos/encuestas-clima` |
| 3 | **Gestión de Personas** | `fa-users-gear` | Directorio de colaboradores, carga masiva por CSV, jerarquía de jefaturas y perfiles completos en un solo lugar. | `/modulos/gestion-personas` |
| 4 | **Estructura Organizacional** | `fa-sitemap` | Hubs (sedes), departamentos y equipos transversales. Define el alcance de cada evaluación con precisión. | `/modulos/estructura-organizacional` |

### How It Works
- **H2:** `En tres pasos, estás listo`
- **Subtítulo:** `Así de simple.`

| # | Paso | Descripción |
|---|---|---|
| 1 | **Configura** | Crea tu cuenta, sube tu equipo por CSV y define tu estructura organizacional. En minutos, no en semanas. |
| 2 | **Lanza** | Activa ciclos de feedback 360°, encuestas de clima o pulso con plantillas listas o personalizadas. |
| 3 | **Actúa** | Recibe reportes claros por persona, equipo o dimensión. Toma decisiones con evidencia, no con intuición. |

### Social Proof
- **H2:** `Resultados que hablan por sí solos`
- **Subtítulo:** `Historias reales de equipos en Colombia y LATAM.`

| Métrica | Label | Cita | Autor |
|---|---|---|---|
| **92%** | participación en feedback | "Con Kultiva logramos que el 92% de nuestro equipo participara en la evaluación 360°. Antes no pasábamos del 60%." | María Claudia Buendía · Gerente de RRHH, BIS |
| **+35%** | mejora en engagement | "Las encuestas de clima nos dieron visibilidad sobre problemas que no conocíamos. Actuamos rápido y el impacto fue inmediato." | Narly Herrera · Jefe de Gestión Humana, Habitat de los Andes |

### CTA Banner
- **H2:** `Transforma la gestión de talento de tu empresa`
- **Subtítulo:** `Agenda una demo personalizada y te mostramos cómo Kultiva se adapta a tu organización.`
- **CTA primario:** `Agendar Demo Gratis` → `/demo`
- **CTA secundario:** `Ver Precios` → `/precios`

---

## Component Notes

- **Hero right column:** dashboard mockup — can start with a static SVG/PNG illustration of a sample overview dashboard showing completion rate, active cycles, and a trendline chart. Budget: design asset needed.
- **Logos strip:** reuse existing `ClientsSection` component; just restyle for homepage position.
- **Testimonials:** reuse `TestimonialSection` component but switch to the metric-first variant (big number, then quote).
- **CTA Banner:** new component with purple #613171 background, centered content, two-button layout.
