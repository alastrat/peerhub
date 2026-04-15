# Page Spec: Demo Request (`/demo`)

**Purpose:** Capture qualified leads with a demo-request form; set clear expectations about what happens next.

**Primary CTA:** Solicitar Demo Gratis (form submit)
**Destination after submit:** Thank-you state + Calendly/email confirmation

---

## Sections

| # | Section | Goal |
|---|---|---|
| 1 | Split hero | Left column: form · Right column: "what to expect" |
| 2 | Trust signals | Client logos + "sin compromiso" note |
| 3 | Quick FAQ | 3 questions to handle final objections |

---

## Wireframe

```
+--------------------------------------------------------------+
|  [Kultiva]  Plataforma▾  Precios  Recursos  Nosotros  [Demo] |
+==============================================================+
|                                                              |
|  H1: Ve Kultiva en acción                                    |
|  Subtítulo: Agenda una demo personalizada. 30 min,           |
|            sin compromiso.                                    |
|                                                              |
|  ┌────────────────────────┐ ┌────────────────────────────┐   |
|  │ FORMULARIO             │ │ QUÉ ESPERAR                │   |
|  │                        │ │                            │   |
|  │ Nombre completo [____] │ │ ① Confirmación rápida       │   |
|  │                        │ │    Te contactamos en menos │   |
|  │ Email corp.    [____]  │ │    de 24 horas hábiles.    │   |
|  │                        │ │                            │   |
|  │ Empresa        [____]  │ │ ② Demo en vivo (30 min)     │   |
|  │                        │ │    Te mostramos la platafor│   |
|  │ Cargo          [____]  │ │    ma con datos adaptados  │   |
|  │                        │ │    a tu empresa.           │   |
|  │ Núm. empleados [v___]  │ │                            │   |
|  │                        │ │ ③ Siguiente paso            │   |
|  │ ¿Qué te interesa?      │ │    Si Kultiva te convence, │   |
|  │ ☐ Feedback 360°        │ │    activamos un piloto de  │   |
|  │ ☐ Encuestas Clima      │ │    14 días con tu equipo.  │   |
|  │ ☐ Gestión Personas     │ │                            │   |
|  │ ☐ Todo                 │ │ ─────────────────────────  │   |
|  │                        │ │                            │   |
|  │ Mensaje (opc.) [____]  │ │ "Sin compromiso. Sin       │   |
|  │                [____]  │ │  tarjeta. Sin llamadas de  │   |
|  │                        │ │  ventas agresivas."        │   |
|  │ [Solicitar Demo]       │ │                            │   |
|  │                        │ │                            │   |
|  │ Te respondemos en 24h  │ │                            │   |
|  └────────────────────────┘ └────────────────────────────┘   |
+==============================================================+
|            Empresas que ya confían en Kultiva                |
|                                                              |
|  [Logo BIS] [Logo Habitat] [Logo Fintra] [Logo Marymount]    |
|                  [Logo AMCHAM]                               |
+==============================================================+
|            Preguntas rápidas                                 |
|                                                              |
|  [+] ¿La demo tiene algún costo?                             |
|  [+] ¿Necesito preparar algo antes de la demo?               |
|  [+] ¿Pueden hacer la demo para todo mi equipo de RR.HH.?    |
+--------------------------------------------------------------+
```

---

## Spanish Copy

### Hero
- **H1:** `Ve Kultiva en acción`
- **Subtítulo:** `Agenda una demo personalizada y descubre cómo la plataforma se adapta a tu organización. 30 minutos, sin compromiso.`

### Form

**Form title:** `Solicita tu demo`

**Fields:**

| Field | Type | Required | Options/placeholder |
|---|---|---|---|
| Nombre completo | text | ✓ | |
| Correo corporativo | email | ✓ | `tu@empresa.com` |
| Empresa | text | ✓ | |
| Cargo | text | ✓ | |
| Número de empleados | select | ✓ | 1-50 / 51-200 / 201-500 / 500+ |
| ¿Qué módulos te interesan? | checkboxes | ✓ | Feedback 360° / Encuestas de Clima / Gestión de Personas / Estructura Org. / Todos |
| Mensaje | textarea | — | "Cuéntanos qué buscas…" |

**CTA button:** `Solicitar Demo Gratis`
**Helper text below button:** `Te respondemos en menos de 24 horas hábiles.`

### What to Expect
- **H3:** `¿Qué pasa después de enviar el formulario?`

| # | Paso | Detalle |
|---|---|---|
| 1 | **Confirmación rápida** | Te contactamos en menos de 24 horas hábiles para coordinar un horario que te funcione. |
| 2 | **Demo en vivo (30 min)** | Te mostramos la plataforma con datos de ejemplo adaptados a tu tipo de empresa. Puedes traer a quien quieras de tu equipo. |
| 3 | **Siguiente paso** | Si Kultiva te convence, activamos un piloto de 14 días con tus datos reales para que pruebes con tu equipo. Sin presión. |

**Trust block:** `Sin compromiso. Sin tarjeta de crédito. Sin llamadas de ventas agresivas.`

### Trust Signals
- **H2:** `Empresas que ya confían en Kultiva`
- **Logos:** BIS, Habitat de los Andes, Fintra SAS, Marymount, AMCHAM Colombia *(pending permission confirmation)*

### FAQ
- **H2:** `Preguntas rápidas`

1. **¿La demo tiene algún costo?** — No, la demo es completamente gratuita y sin compromiso. Tampoco pedimos tarjeta de crédito.
2. **¿Necesito preparar algo antes de la demo?** — Nada obligatorio. Si quieres que la demo sea más relevante, puedes enviarnos tu organigrama o el número de sedes y empleados.
3. **¿Pueden hacer la demo para todo mi equipo de RR.HH.?** — Sí. De hecho lo recomendamos. Incluye a quien quieras en la sesión para que todos puedan hacer preguntas y evaluar juntos.

---

## Implementation Notes

- **Form submission:** needs backend endpoint. Options:
  - POST to internal API that stores in DB (needs new `DemoRequest` model) + sends email notification via Resend
  - POST to external service (HubSpot forms, Calendly, etc.)
- **Recommend:** internal DB + Resend for control, unless CRM already chosen
- **Spam protection:** add honeypot field or reCAPTCHA for production
- **Thank-you state:** after submission, hide form and show confirmation message with optional Calendly embed for immediate scheduling
- **URL params support:** `?plan=starter|business|enterprise` and `?source=pricing` should pre-fill or tag the submission for lead tracking
