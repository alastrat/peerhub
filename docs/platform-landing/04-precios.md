# Page Spec: Pricing (`/precios`)

**Purpose:** Show pricing options with transparency so buyers pre-qualify before requesting a demo. Reduces sales friction by surfacing fit upfront.

**Primary CTA:** Agendar Demo Gratis → `/demo`
**Secondary CTA:** Hablar con Ventas → `/demo?source=pricing`

---

## Sections

| # | Section | Goal |
|---|---|---|
| 1 | Hero | Headline + monthly/annual toggle |
| 2 | Tier cards | Starter, Business, Enterprise (3 cards) |
| 3 | Comparison table | Feature-by-feature comparison |
| 4 | Pricing FAQ | 5 questions |
| 5 | CTA | Demo + sales contact |

---

## Proposed Pricing Tiers

> ⚠️ **Pricing is a placeholder** — requires founder approval before publishing. See Open Question §12.1 in strategy doc.

| Tier | Price | Target | Feature ceiling |
|---|---|---|---|
| **Starter** | $3 USD/user/month (annual) | Small teams starting out | 50 users, 1 admin, Feedback 360 only |
| **Business** ⭐ | $5 USD/user/month (annual) | Growing companies | 200 users, 3 admins, +Climate Surveys, +Templates |
| **Enterprise** | Custom quote | Complex orgs | Unlimited, SSO, API, SLA, dedicated support |

Annual billing shows -20% vs monthly.

---

## Wireframe

```
+--------------------------------------------------------------+
|  [Kultiva]  Plataforma▾  Precios  Recursos  Nosotros  [Demo] |
+==============================================================+
|                                                              |
|  H1: Planes que crecen contigo                               |
|  Subtítulo: Sin costos escondidos...                         |
|                                                              |
|         [ Mensual | Anual (-20%) ]   (toggle)                |
|                                                              |
|  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           |
|  │  STARTER    │  │  BUSINESS   │  │ ENTERPRISE  │           |
|  │             │  │ ★ POPULAR ★ │  │             │           |
|  │             │  │             │  │             │           |
|  │ Para equipos│  │ Para empresas│  │ Para organiz│           |
|  │ que inician │  │ en crecimien│  │ complejas   │           |
|  │             │  │             │  │             │           |
|  │   $3 USD    │  │   $5 USD    │  │ A medida    │           |
|  │  /usuario   │  │  /usuario   │  │             │           |
|  │    /mes     │  │    /mes     │  │             │           |
|  │             │  │             │  │             │           |
|  │ ✓ Feedback  │  │ ✓ Todo      │  │ ✓ Todo      │           |
|  │   360°      │  │   Starter   │  │   Business  │           |
|  │ ✓ Hasta 50  │  │ ✓ Encuestas │  │ ✓ Usuarios  │           |
|  │   usuarios  │  │   de Clima  │  │   ilimitados│           |
|  │ ✓ 1 admin   │  │ ✓ Hasta 200 │  │ ✓ SSO       │           |
|  │ ✓ Competenc.│  │ ✓ 3 admins  │  │ ✓ API       │           |
|  │   incluidas │  │ ✓ Plantillas│  │ ✓ SLA       │           |
|  │             │  │ ✓ Onboarding│  │ ✓ Soporte   │           |
|  │             │  │   guiado    │  │   dedicado  │           |
|  │             │  │             │  │             │           |
|  │ [Comenzar]  │  │ [Comenzar]  │  │ [Contactar] │           |
|  └─────────────┘  └─────────────┘  └─────────────┘           |
+==============================================================+
|            Compara los planes en detalle                     |
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │ Característica         │ Starter │ Business │Enterprise│  |
|  ├────────────────────────┼─────────┼──────────┼──────────┤  |
|  │ Feedback 360°          │   ✓     │    ✓     │    ✓     │  |
|  │ Encuestas de Clima     │   —     │    ✓     │    ✓     │  |
|  │ Gestión de Personas    │   ✓     │    ✓     │    ✓     │  |
|  │ Estructura Organiz.    │   ✓     │    ✓     │    ✓     │  |
|  │ Usuarios               │Hasta 50 │Hasta 200 │Ilimitados│  |
|  │ Administradores        │    1    │    3     │Ilimitados│  |
|  │ Plantillas de clima    │   —     │Incluidas │Personaliz│  |
|  │ Exportación CSV        │   ✓     │    ✓     │    ✓     │  |
|  │ Soporte                │ Email   │Prioritar.│Dedicado  │  |
|  │ SSO / SAML             │   —     │    —     │    ✓     │  |
|  │ API de integración     │   —     │    —     │    ✓     │  |
|  │ SLA garantizado        │   —     │    —     │    ✓     │  |
|  │ Onboarding guiado      │   —     │    ✓     │    ✓     │  |
|  └────────────────────────────────────────────────────────┘  |
+==============================================================+
|            Preguntas sobre precios                           |
|                                                              |
|  [+] ¿Puedo cambiar de plan en cualquier momento?            |
|  [+] ¿Qué pasa si supero el límite de usuarios?              |
|  [+] ¿Hay período de prueba?                                 |
|  [+] ¿Cómo funciona la facturación?                          |
|  [+] ¿Ofrecen descuento para ONGs o educación?               |
+==============================================================+
|                                                              |
|  ██████ CTA ██████                                           |
|  █ ¿No estás seguro? Te ayudamos a elegir.   █               |
|  █ [Agendar Demo Gratis]  [Hablar con Ventas] █              |
|                                                              |
+--------------------------------------------------------------+
```

---

## Spanish Copy

### Hero
- **H1:** `Planes que crecen contigo`
- **Subtítulo:** `Precios claros por usuario, sin costos escondidos ni sorpresas. Paga solo por lo que necesitas.`
- **Toggle:** `Mensual` | `Anual (ahorra 20%)`

### Starter Tier
- **Nombre:** `Starter`
- **Descripción:** `Para equipos pequeños que quieren profesionalizar su proceso de feedback.`
- **Precio:** `$3 USD / usuario / mes` (facturado anualmente)
- **Features:**
  - Feedback 360° completo
  - Gestión de personas
  - Estructura organizacional
  - Hasta 50 usuarios
  - 1 administrador
  - Competencias incluidas
  - Exportación CSV
  - Soporte por email
- **CTA:** `Comenzar con Starter` → `/demo?plan=starter`

### Business Tier (Most Popular)
- **Nombre:** `Business` · *badge: ⭐ MÁS POPULAR*
- **Descripción:** `Para empresas en crecimiento que necesitan medir clima y dar feedback de forma continua.`
- **Precio:** `$5 USD / usuario / mes` (facturado anualmente)
- **Features:**
  - Todo lo de Starter
  - Encuestas de Clima (CLIMATE, PULSE, eNPS)
  - Hasta 200 usuarios
  - 3 administradores
  - Plantillas de clima incluidas
  - Onboarding guiado
  - Soporte prioritario
- **CTA:** `Comenzar con Business` → `/demo?plan=business`

### Enterprise Tier
- **Nombre:** `Enterprise`
- **Descripción:** `Para organizaciones con múltiples sedes que requieren integraciones, seguridad avanzada y soporte dedicado.`
- **Precio:** `A medida` (contactar ventas)
- **Features:**
  - Todo lo de Business
  - Usuarios ilimitados
  - Administradores ilimitados
  - SSO / SAML
  - API de integración
  - SLA garantizado
  - Plantillas personalizadas
  - Soporte dedicado con account manager
- **CTA:** `Contactar Ventas` → `/demo?plan=enterprise`

### FAQ
- **H2:** `Preguntas frecuentes sobre precios`

1. **¿Puedo cambiar de plan en cualquier momento?** — Sí. Puedes subir de plan cuando quieras y el cambio se prorratea en tu ciclo de facturación actual. Para bajar de plan, el cambio se aplica en el próximo ciclo.
2. **¿Qué pasa si supero el límite de usuarios?** — Te notificamos cuando estés cerca del límite. Puedes agregar usuarios adicionales o subir al siguiente plan sin interrupciones.
3. **¿Hay período de prueba?** — Ofrecemos una demo personalizada gratuita y podemos habilitar un piloto de 14 días con datos reales para que evalúes la plataforma con tu equipo.
4. **¿Cómo funciona la facturación?** — Facturamos mensual o anualmente en USD. Aceptamos tarjeta de crédito y transferencia bancaria. Emitimos factura electrónica compatible con la normativa colombiana.
5. **¿Ofrecen descuento para ONGs o instituciones educativas?** — Sí. Contáctanos con los datos de tu organización y te presentamos nuestro programa de descuento social.

### CTA
- **H2:** `¿No estás seguro de cuál plan necesitas?`
- **Descripción:** `Agenda una llamada de 15 minutos y te ayudamos a elegir el plan correcto para tu empresa.`
- **CTA primario:** `Agendar Demo Gratis` → `/demo`
- **CTA secundario:** `Hablar con Ventas` → `/demo?source=pricing`
