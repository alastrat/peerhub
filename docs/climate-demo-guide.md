# Climate Scoring & Action Plans — Demo Guide

About 15 minutes, run locally. Everything below uses the demo company "Kultiva Demo".

## 0. Set up (once)

> ⚠️ **`prisma db seed` deletes every table before seeding.** Your main checkout's `.env` points at the remote Supabase database, so run these commands only where `DATABASE_URL` is a **local** database. This worktree's `.env` points at `localhost:5433/peerhub_climate`. The demo scripts refuse to run against a non-local database.

```bash
docker compose up -d postgres                 # local Postgres on :5433
npx prisma migrate deploy && npx prisma db seed
npx tsx scripts/seed-climate-demo.ts          # demo data (re-run to reset)
PORT=4999 npm run dev
npx tsx scripts/demo-links.ts                 # sign-in links for each role
```

**Demo data:**
- **Two surveys** of the validated instrument:
  - "Clima organizacional 2025 (demo)": closed and released, with 3 leader plans in progress.
  - "Clima organizacional 2026 (demo)": active, results not released yet.
- **Leaders:**
  - Sara Martínez (6 reports)
  - Miguel Rodríguez (5 reports)
  - Ana Ruiz (2 reports). Her team is below the minimum of 5, so its results stay hidden.
- **Demographics:** everyone has a gender, a date of birth and a start date.

**Sign-in:**
- **Admin:** the dashboard link from `demo-links.ts`. It's a dev-only route and can be reused.
- **Leaders and team members:** portal magic links. Each works **once** and lasts 24 h; re-run `demo-links.ts` for fresh ones.
- **Emails:** in dev mode they're printed in the server terminal, including their magic links.

## 1. Results (admin) — the validated scoring

Open the admin link. It lands on **Clima organizacional 2026 (demo) → Análisis**.

- **Índice de Clima:** the 1–4 mean, its level (Muy favorable / Favorable / Desfavorable / Muy desfavorable), the % of favorable answers (Casi siempre or Siempre), and the goal.
- **Puntajes por dimensión:** the 12 dimensions, each with its mean, level and favorability.
- **Puntos de atención:** dimensions and groups below the goal, lowest first.
- **Heatmaps** by department, leader, **gender, generation and tenure**. Groups with fewer than 5 responses show a lock instead of numbers (e.g. "Ana Ruiz (2)", "No binario (2)").
- **Resultados por pregunta:** Nunca…Siempre distributions per item, each tagged "Ítem validado · LID-1"…

## 2. The instrument is locked

- **Questions tab:** validated items have no edit pencil.
- **New survey:** Encuestas → Clima → new survey → template "Instrumento Kultiva de Clima Organizacional" → Siguiente.
  - Each dimension shows "Instrumento validado" with read-only items.
  - Only the whole dimension can be removed.
  - Custom Likert questions get a **Escala** picker: Frecuencia 1–4 or Acuerdo 1–5.

## 3. Settings and release (admin)

1. **Configuración → "Resultados y planes de acción":** goal level, plans per leader (2 in the demo), plan deadline, HR follow-up.
2. **Planes de acción tab:**
   - It shows each leader's gaps and how many plans they owe.
   - Click **"Publicar resultados a líderes"**.
   - The toast says how many leaders were emailed: Sara and Miguel, but not Ana, because her team is too small.
   - The deadline defaults to 15 days later.

## 4. Leader (portal)

Open **Sara's** link. It lands on her team results:

- **Her team only:** 6 responses, banded dimensions, and a banner "se espera un mínimo de 2 planes…".
- **Brechas de tu equipo:** each gap has a **Crear plan de acción** button.
  - The dialog pre-fills the baseline and a target one level up.
  - Create the draft.
- **In the plan:**
  - Add a task assigned to **Santiago Gómez** with a due date.
  - Optionally add a progress indicator ("1:1 realizados", base 0, meta 8).
  - Click **Enviar plan**. HR and Santiago are emailed (see the terminal).
- **Optional:** answer the 4 "Contexto del equipo" questions.

## 5. Task owner (portal)

Open **Santiago's** link and go to **Mis tareas**:

- Set the task to "En progreso" and add a progress note.
- Open the plan: Santiago can only update his own task. There's no edit, complete or delete for him.

## 6. Follow-up (admin)

Back on the 2026 survey, open **Planes de acción**:

- **Compliance:** Sara 1/2, "Faltan planes"; Miguel 0/2.
- **Admin plans:** **Nuevo plan de acción** creates plans for the whole organization, a department or a leader's team, with an owner.

## 7. Impact — did the plans work?

1. On the 2026 survey, use **⋮ → Cerrar encuesta**.
2. Open **Clima organizacional 2025 (demo) → Planes de acción**. The 2025 plans have just been measured against 2026:
   - **Sara — Calidad de vida:** 1.67 Muy desfavorable → **Mejoró**
   - **Sara — Salud mental:** 2.57 Desfavorable → **Empeoró**
   - **Miguel — Gestión de cambio:** 2.28 Muy desfavorable → **Mejoró**
3. Each owner gets an "Impacto del plan" email. Re-running "Evaluar impacto" doesn't send it again.

## 8. People demographics

- **Personas → any employee → Editar:** the "Datos demográficos" section has género, fecha de nacimiento and fecha de ingreso.
- **Personas → Importar:** the CSV template includes `startDate`, `gender` (F / M / No binario / Prefiero no decirlo) and `birthDate`.

## 9. Scheduled reminders

- `vercel.json` runs `GET /api/cron/climate-plans` every day at 08:00 Bogotá (13:00 UTC).
- It sends:
  - A daily digest of tasks due within 3 days or overdue.
  - A one-time nudge to leaders below their plan minimum, 3 days before the deadline.
- To try it locally: `curl http://localhost:4999/api/cron/climate-plans`

## Reset

```bash
# local database only — see the warning in step 0
npx prisma db seed && npx tsx scripts/seed-climate-demo.ts && npx tsx scripts/demo-links.ts
```
