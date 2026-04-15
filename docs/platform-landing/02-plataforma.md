# Page Spec: Plataforma (`/plataforma`)

**Purpose:** Full platform overview — enough depth for an HR manager to understand capabilities without needing a demo. Drives to module detail pages or demo request.

**Primary CTA:** Agendar Demo → `/demo`
**Secondary CTAs:** "Ver [módulo] en detalle" → each module page

---

## Sections

| # | Section | Goal |
|---|---|---|
| 1 | Hero | Product-oriented headline + dashboard visual |
| 2 | Modules overview | 4 alternating blocks (image L/R) with feature bullets |
| 3 | Transversal capabilities | Security, multi-tenant, roles, export |
| 4 | Integrations / Tech | Stack and compatibility (placeholder — nothing to show yet) |
| 5 | CTA banner | Demo request |

---

## Wireframe

```
+--------------------------------------------------------------+
|  [Kultiva]  Plataforma▾  Precios  Recursos  Nosotros  [Demo] |
+==============================================================+
|                                                              |
|  Badge: PLATAFORMA                                           |
|  H1: Conoce Kultiva por dentro                               |
|  Subtítulo: Cuatro módulos, una sola plataforma...           |
|                                                              |
|  [Agendar Demo]   [Explorar Módulos ▼]                       |
+==============================================================+
|                                                              |
|  ── Módulo 1: Feedback 360° ─────────────────────────────    |
|  ┌────────────────────┐  ┌─────────────────────────┐         |
|  │  [Screenshot/      │  │ H3: Feedback 360°       │         |
|  │   Mockup de ciclo  │  │ Descripción 2-3 líneas  │         |
|  │   de feedback]     │  │                         │         |
|  │                    │  │ ✓ Múltiples evaluadores │         |
|  │                    │  │ ✓ Competencias config.  │         |
|  │                    │  │ ✓ Umbral de anonimato   │         |
|  │                    │  │ ✓ Control de reportes   │         |
|  │                    │  │                         │         |
|  └────────────────────┘  │ [Ver detalle →]         │         |
|                          └─────────────────────────┘         |
|                                                              |
|  ── Módulo 2: Encuestas de Clima ────────────────────────    |
|  ┌─────────────────────────┐  ┌────────────────────┐         |
|  │ H3: Encuestas de Clima  │  │ [Screenshot/       │         |
|  │ Descripción 2-3 líneas  │  │  Mockup encuesta]  │         |
|  │                         │  │                    │         |
|  │ ✓ CLIMATE, PULSE, eNPS  │  │                    │         |
|  │ ✓ Dimensiones config.   │  │                    │         |
|  │ ✓ Plantillas incluidas  │  │                    │         |
|  │ ✓ Segmentación flexible │  │                    │         |
|  │                         │  └────────────────────┘         |
|  │ [Ver detalle →]         │                                 |
|  └─────────────────────────┘                                 |
|                                                              |
|  ── Módulo 3: Gestión de Personas ──────────────────────     |
|  ┌────────────────────┐  ┌─────────────────────────┐         |
|  │ [Screenshot        │  │ H3: Gestión de Personas │         |
|  │  directorio]       │  │ Descripción 2-3 líneas  │         |
|  │                    │  │ ✓ CRUD de empleados     │         |
|  │                    │  │ ✓ Carga masiva CSV      │         |
|  │                    │  │ ✓ Jerarquía de jefes    │         |
|  │                    │  │ ✓ Perfiles completos    │         |
|  └────────────────────┘  │ [Ver detalle →]         │         |
|                          └─────────────────────────┘         |
|                                                              |
|  ── Módulo 4: Estructura Organizacional ────────────────     |
|  ┌─────────────────────────┐  ┌────────────────────┐         |
|  │ H3: Estructura Org.     │  │ [Mockup de         │         |
|  │ Descripción 2-3 líneas  │  │  organigrama]      │         |
|  │ ✓ Hubs (sedes)          │  │                    │         |
|  │ ✓ Departamentos         │  │                    │         |
|  │ ✓ Equipos transversales │  │                    │         |
|  │ ✓ Scoping de encuestas  │  │                    │         |
|  │ [Ver detalle →]         │  └────────────────────┘         |
|  └─────────────────────────┘                                 |
+==============================================================+
|            Capacidades transversales                         |
|                                                              |
|  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          |
|  │[🔒]     │  │[🏢]     │  │[🔑]     │  │[📤]     │          |
|  │Seguridad│  │ Multi-  │  │Roles y  │  │Export   │          |
|  │de datos │  │ tenant  │  │permisos │  │ CSV     │          |
|  │         │  │         │  │         │  │         │          |
|  │Cifrado, │  │Espacio  │  │ADMIN/   │  │Reportes │          |
|  │backups  │  │aislado  │  │MANAGER/ │  │descarg. │          |
|  │         │  │por empr.│  │MEMBER   │  │         │          |
|  └─────────┘  └─────────┘  └─────────┘  └─────────┘          |
+==============================================================+
|                                                              |
|  ██████ CTA BANNER ██████                                    |
|  █ Agenda tu demo y ve Kultiva en acción █                   |
|  █ [Agendar Demo Gratis] █                                   |
|                                                              |
+--------------------------------------------------------------+
```

---

## Spanish Copy

### Hero
- **Badge:** `Plataforma`
- **H1:** `Conoce Kultiva por dentro`
- **Subtítulo:** `Cuatro módulos integrados para gestionar feedback, clima, personas y estructura organizacional. Diseñada para equipos de talento humano en Latinoamérica que necesitan resultados, no más herramientas.`
- **CTA primario:** `Agendar Demo` → `/demo`
- **CTA secundario:** `Explorar Módulos` → anchor scroll

### Module 1 — Feedback 360°
- **H3:** `Feedback 360°`
- **Descripción:** `Lanza ciclos de evaluación donde cada colaborador recibe retroalimentación de su jefe, pares, reportes directos y evaluadores externos. Configura las competencias, define umbrales de anonimato y controla cuándo se liberan los reportes.`
- **Bullets:**
  - Múltiples tipos de evaluador: autoevaluación, jefe, par, reporte directo, externo
  - Competencias y preguntas completamente configurables
  - Umbral de anonimato para proteger la honestidad del feedback
  - Control granular sobre la liberación de reportes individuales
- **CTA:** `Ver Feedback 360° en detalle` → `/modulos/feedback-360`

### Module 2 — Encuestas de Clima
- **H3:** `Encuestas de Clima`
- **Descripción:** `Mide la percepción de tu equipo con tres tipos de encuesta: Clima completo, Pulso rápido y eNPS. Usa plantillas listas o crea las tuyas con dimensiones personalizadas. Segmenta por sede, departamento, equipo o selección manual.`
- **Bullets:**
  - Tres tipos: CLIMATE (completa), PULSE (rápida), eNPS (lealtad)
  - Dimensiones y preguntas configurables por plantilla
  - Segmentación: toda la empresa, hub, departamento, equipo o selección personalizada
  - Plantillas incluidas con mejores prácticas de la región
- **CTA:** `Ver Encuestas de Clima en detalle` → `/modulos/encuestas-clima`

### Module 3 — Gestión de Personas
- **H3:** `Gestión de Personas`
- **Descripción:** `Centraliza la información de tus colaboradores en perfiles completos. Importa tu equipo de una sola vez con carga masiva por CSV, asigna jefaturas y mantén tu directorio actualizado sin depender de hojas de cálculo.`
- **Bullets:**
  - Creación, edición y baja de colaboradores
  - Importación masiva por archivo CSV
  - Asignación de jerarquía de jefaturas
  - Perfiles con datos de contacto, cargo, departamento y sede
- **CTA:** `Ver Gestión de Personas en detalle` → `/modulos/gestion-personas`

### Module 4 — Estructura Organizacional
- **H3:** `Estructura Organizacional`
- **Descripción:** `Define cómo se organiza tu empresa: sedes (hubs), departamentos y equipos transversales. Esta estructura alimenta la segmentación de encuestas y el alcance de los ciclos de feedback.`
- **Bullets:**
  - Hubs para modelar sedes o ubicaciones geográficas
  - Departamentos dentro de cada hub
  - Equipos transversales que cruzan departamentos
  - Alcance preciso para cada encuesta o ciclo de evaluación
- **CTA:** `Ver Estructura Organizacional en detalle` → `/modulos/estructura-organizacional`

### Transversal Capabilities
- **H2:** `Construida para equipos serios`
- **Subtítulo:** `Cada módulo comparte una base sólida de seguridad, permisos y gobernanza.`

| # | Título | Descripción |
|---|---|---|
| 1 | **Seguridad de datos** | Cifrado en tránsito y en reposo. Infraestructura cloud con backups automáticos. |
| 2 | **Multi-tenant** | Cada empresa opera en su propio espacio aislado. Tus datos nunca se mezclan. |
| 3 | **Roles y permisos** | Roles globales (Super Admin, Usuario) y por empresa (Admin, Manager, Empleado) con control granular. |
| 4 | **Exportación CSV** | Descarga cualquier reporte o listado en CSV para procesarlo en tu herramienta favorita. |

### CTA Final
- **H2:** `Agenda tu demo y ve Kultiva en acción`
- **Descripción:** `Te mostramos la plataforma con tus datos y tu estructura. 30 minutos, sin compromiso.`
- **CTA:** `Agendar Demo Gratis` → `/demo`
