"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ClipboardList, Flag, Paperclip, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import type { LeaderPlanSummary, LeaderTeamView } from "@/lib/queries/action-plans";
import {
  createSingleActionPlan,
  deleteSingleActionPlan,
  getTaskEvidenceUrl,
  saveLeaderContext,
  setSingleActionPlanStatus,
  updateSingleActionPlan,
  uploadTaskEvidence,
  type SingleActionStatus,
} from "@/lib/actions/action-plans";
import { MAX_EVIDENCE_BYTES, MAX_EVIDENCE_MB } from "@/lib/constants/action-plan-evidence";
import { CLIMATE_SCALES, getScaleAnchor, getScaleValues } from "@/lib/constants/climate-scales";
import { BandBadge, formatMean, formatPct } from "../climate-score-ui";
import { NativeSelect, PlanStatusBadge, toDateInput } from "./plan-ui";

const CONTEXT_KEYS = ["q1", "q2", "q3", "q4"] as const;
const ACTION_STATUSES: SingleActionStatus[] = ["PENDING", "IN_PROGRESS", "DONE"];
const MAX_ACTION = 200;

interface LeaderPlansPanelProps {
  view: LeaderTeamView;
  /** The leader or an admin: may create, edit and delete plans. */
  canEdit: boolean;
  /** Only the leader answers the team context; others see it read-only. */
  canAnswerContext: boolean;
  /** Plan detail page for plans made with the full editor (several tasks), e.g. "/portal/climate-plans/". */
  planDetailBase?: string;
  backHref?: string;
  backLabel?: string;
}

type FormState = { mode: "new"; dimensionId: string } | { mode: "edit"; plan: LeaderPlanSummary };

function longDate(value: Date | string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** POC-style leader view: dimension cards against the goal, inline single-action plans, plan cards. */
export function LeaderPlansPanel({ view, canEdit, canAnswerContext, planDetailBase, backHref, backLabel }: LeaderPlansPanelProps) {
  const t = useTranslations("climate_plans.panel");
  const tl = useTranslations("climate_plans");
  const ts = useTranslations("climate_scoring");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const { survey, leader, gaps, plans } = view;
  const goal = ts("favorable_pct", { pct: survey.goalPct });
  const gapIds = new Set(gaps.gaps.map((g) => g.dimensionId));

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok?: string, after?: () => void) {
    startTransition(async () => {
      let res: { success: boolean; error?: string };
      try {
        res = await fn();
      } catch {
        // A network failure, or a file over the server action's body limit
        toast.error(tl("error_generic"));
        return;
      }
      if (!res.success) {
        toast.error(res.error ?? tl("error_generic"));
        return;
      }
      if (ok) toast.success(ok);
      after?.();
      router.refresh();
    });
  }

  function openForm(next: FormState) {
    setForm(next);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  const formDimensionName =
    form?.mode === "edit"
      ? form.plan.dimensionName
      : gaps.dimensions.find((d) => d.dimensionId === form?.dimensionId)?.dimensionName ?? "";

  return (
    <div className="space-y-6">
      <ContextCard view={view} editable={canAnswerContext} />

      <section className="space-y-4">
        <h2 className="border-b pb-2 text-lg font-semibold text-primary">{t("gaps_title", { name: leader.name, goal })}</h2>

        {gaps.required > 0 && (
          <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
            <Flag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{t("minimum", { required: gaps.required, name: leader.name, done: view.submittedOnGaps })}</span>
          </div>
        )}

        {gaps.suppressed ? (
          <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            {t("suppressed", { k: survey.anonymityThreshold })}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {gaps.dimensions.map((d) => {
              const isGap = gapIds.has(d.dimensionId);
              const count = plans.filter((p) => p.dimensionId === d.dimensionId).length;
              return (
                <div
                  key={d.dimensionId}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl p-4 text-center",
                    isGap ? "bg-red-50 text-red-900" : "bg-lime-50 text-lime-900",
                  )}
                >
                  <p className="text-sm font-semibold leading-tight">{d.dimensionName}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatMean(d.mean)}
                    <span className="ml-1 text-sm font-medium opacity-70">/ 4</span>
                  </p>
                  {d.band && <BandBadge band={d.band} />}
                  {d.favorability != null && (
                    <p className="text-xs opacity-80">{t("favorable", { pct: Math.round(d.favorability * 100) })}</p>
                  )}
                  <p className="text-xs opacity-80">
                    {isGap ? t("below_goal", { goal }) : t("good")}
                    {count > 0 && ` · ${t("plans_created", { count })}`}
                  </p>
                  {canEdit && isGap && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-1 h-auto rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-white"
                      onClick={() => openForm({ mode: "new", dimensionId: d.dimensionId })}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {count > 0 ? t("add_another") : t("create")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {form && (
          <div ref={formRef}>
            <PlanForm
              key={form.mode === "edit" ? form.plan.id : form.dimensionId}
              form={form}
              dimensionName={formDimensionName}
              surveyId={survey.id}
              leaderId={leader.id}
              defaultEnd={survey.planDueDate}
              pending={pending}
              run={run}
              onClose={() => setForm(null)}
            />
          </div>
        )}
      </section>

      <div className="rounded-2xl border bg-muted/40 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("ai_title")}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("ai_soon")}
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("ai_desc")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="border-b pb-2 text-lg font-semibold text-primary">{t("plans_title", { count: plans.length })}</h2>
        {plans.length === 0 && <p className="text-sm text-muted-foreground">{t("no_plans")}</p>}
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            canEdit={canEdit}
            locale={locale}
            pending={pending}
            run={run}
            planDetailBase={planDetailBase}
            onEdit={() => openForm({ mode: "edit", plan })}
          />
        ))}
      </section>

      {!gaps.suppressed && view.items.length > 0 && <ItemDetail view={view} locale={locale} />}

      {backHref && (
        <Button asChild variant="secondary" className="rounded-full">
          <Link href={backHref}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** How the team answered each validated item, per dimension (collapsed by default). */
function ItemDetail({ view, locale }: { view: LeaderTeamView; locale: string }) {
  const tl = useTranslations("climate_plans");
  return (
    <details className="group rounded-2xl border bg-card p-4">
      <summary className="cursor-pointer font-semibold">{tl("leader.items_title")}</summary>
      <div className="mt-4 space-y-5">
        {view.gaps.dimensions
          .filter((d) => d.isInstrument)
          .map((d) => (
            <div key={d.dimensionId} className="space-y-2">
              <p className="text-sm font-semibold">{d.dimensionName}</p>
              {view.items
                .filter((i) => i.dimensionId === d.dimensionId && i.itemCode)
                .map((i) => {
                  const scale = CLIMATE_SCALES[i.scaleKey ?? "FREQ_4"];
                  const answered = Object.values(i.distribution).reduce((sum, c) => sum + c, 0);
                  return (
                    <div key={i.questionId} className="space-y-1 rounded-md bg-muted/40 p-2">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <span>{i.text}</span>
                        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatMean(i.mean)} · {formatPct(i.favorability)}
                        </span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                        {getScaleValues(scale).map((v) => {
                          const share = answered ? (i.distribution[v] ?? 0) / answered : 0;
                          const color = ["bg-red-400", "bg-amber-400", "bg-lime-400", "bg-green-500"][v - 1] ?? "bg-primary";
                          return (
                            <div
                              key={v}
                              className={color}
                              style={{ width: `${share * 100}%` }}
                              title={`${getScaleAnchor(scale, v, locale)}: ${Math.round(share * 100)}%`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------

function ContextCard({ view, editable }: { view: LeaderTeamView; editable: boolean }) {
  const t = useTranslations("climate_plans.panel");
  const tl = useTranslations("climate_plans");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(view.context ?? {});
  const [pending, startTransition] = useTransition();
  const answered = !!view.context && Object.values(view.context).some((v) => v?.trim());

  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <ClipboardList className="h-4 w-4 text-primary" />
        {t("context_title")}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t("context_desc")}</p>

      {open ? (
        <div className="mt-3 space-y-3">
          {CONTEXT_KEYS.map((k) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`ctx-${k}`}>{tl(`leader.context.${k}`)}</Label>
              <Textarea id={`ctx-${k}`} rows={2} value={answers[k] ?? ""} onChange={(e) => setAnswers({ ...answers, [k]: e.target.value })} />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await saveLeaderContext(view.survey.id, answers);
                  if (!res.success) return void toast.error(res.error ?? tl("error_generic"));
                  toast.success(tl("saved"));
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {tl("save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : answered ? (
        <dl className="mt-3 space-y-2 text-sm">
          {CONTEXT_KEYS.filter((k) => view.context?.[k]?.trim()).map((k) => (
            <div key={k}>
              <dt className="font-medium">{tl(`leader.context.${k}`)}</dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">{view.context![k]}</dd>
            </div>
          ))}
          {editable && (
            <Button size="sm" variant="ghost" className="-ml-3" onClick={() => setOpen(true)}>
              {t("context_edit")}
            </Button>
          )}
        </dl>
      ) : editable ? (
        <Button size="sm" variant="ghost" className="mt-2 -ml-3" onClick={() => setOpen(true)}>
          {t("context_answer")}
        </Button>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground">{t("context_pending")}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlanForm({
  form,
  dimensionName,
  surveyId,
  leaderId,
  defaultEnd,
  pending,
  run,
  onClose,
}: {
  form: FormState;
  dimensionName: string;
  surveyId: string;
  leaderId: string;
  defaultEnd: Date | null;
  pending: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>, ok?: string, after?: () => void) => void;
  onClose: () => void;
}) {
  const t = useTranslations("climate_plans.panel");
  const tl = useTranslations("climate_plans");
  const editing = form.mode === "edit" ? form.plan : null;
  const empty = { action: "", start: toDateInput(new Date()), end: toDateInput(defaultEnd) };
  const [values, setValues] = useState(
    editing ? { action: editing.title, start: toDateInput(editing.startDate), end: toDateInput(editing.endDate) } : empty,
  );
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const valid = values.action.trim() && values.start && values.end;

  function save(addAnother: boolean) {
    if (editing) {
      run(() => updateSingleActionPlan(editing.id, { action: values.action, startDate: values.start, endDate: values.end }), t("saved"), onClose);
      return;
    }
    run(
      async () => {
        const res = await createSingleActionPlan({
          surveyId,
          leaderEmployeeId: leaderId,
          dimensionId: (form as { dimensionId: string }).dimensionId,
          action: values.action,
          startDate: values.start,
          endDate: values.end,
        });
        if (!res.success || !file) return res;
        // The plan exists now: a failed upload must not keep the form open,
        // or saving again would create a second plan
        const fd = new FormData();
        fd.append("file", file);
        const uploaded = await uploadTaskEvidence(res.data!.taskId, fd).catch(() => null);
        if (!uploaded?.success) {
          toast.warning(t("evidence_failed", { reason: uploaded?.error ?? tl("error_generic") }));
        }
        return { success: true };
      },
      t("saved"),
      () => {
        setFile(null);
        if (addAnother) setValues(empty);
        else onClose();
      },
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-primary/40 bg-muted/30 p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Flag className="h-4 w-4 text-primary" />
        {editing ? t("edit_plan", { dimension: dimensionName }) : t("new_plan", { dimension: dimensionName })}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="plan-action">{t("action_label")}</Label>
        <Textarea
          id="plan-action"
          rows={3}
          maxLength={MAX_ACTION}
          placeholder={t("action_placeholder")}
          value={values.action}
          onChange={(e) => setValues({ ...values, action: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="plan-start">{t("start")}</Label>
          <Input id="plan-start" type="date" value={values.start} onChange={(e) => setValues({ ...values, start: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-end">{t("end")}</Label>
          <Input id="plan-end" type="date" value={values.end} onChange={(e) => setValues({ ...values, end: e.target.value })} />
        </div>
      </div>
      {!editing && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("evidence")}</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {file ? file.name : t("attach")}
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => {
              const picked = e.target.files?.[0] ?? null;
              e.target.value = "";
              // Checked here so the plan is never saved with a file the upload would reject
              if (picked && picked.size > MAX_EVIDENCE_BYTES) {
                toast.error(tl("errors.file_too_large", { max: MAX_EVIDENCE_MB }));
                return;
              }
              setFile(picked);
            }}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending || !valid} onClick={() => save(false)}>
          {t("save")}
        </Button>
        {!editing && (
          <Button size="sm" variant="ghost" disabled={pending || !valid} onClick={() => save(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("save_another")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  canEdit,
  locale,
  pending,
  run,
  planDetailBase,
  onEdit,
}: {
  plan: LeaderPlanSummary;
  canEdit: boolean;
  locale: string;
  pending: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>, ok?: string, after?: () => void) => void;
  planDetailBase?: string;
  onEdit: () => void;
}) {
  const t = useTranslations("climate_plans.panel");
  const tl = useTranslations("climate_plans");
  const fileRef = useRef<HTMLInputElement>(null);
  const single =plan.isSingleAction && plan.action && plan.status !== "DRAFT";
  const status: SingleActionStatus = plan.status === "COMPLETED" ? "DONE" : ((plan.action?.status as SingleActionStatus) ?? "PENDING");
  const open = plan.status === "ACTIVE" || plan.status === "DRAFT";

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-primary">{plan.dimensionName}</p>
        {single && canEdit ? (
          <NativeSelect
            aria-label={t("status_label")}
            className="h-8 w-40"
            value={status === "PENDING" || status === "IN_PROGRESS" || status === "DONE" ? status : "PENDING"}
            disabled={pending}
            onChange={(e) => run(() => setSingleActionPlanStatus(plan.id, e.target.value as SingleActionStatus), t("status_updated"))}
          >
            {ACTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </NativeSelect>
        ) : single ? (
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">{t(`status.${status}`)}</span>
        ) : (
          <PlanStatusBadge status={plan.status} />
        )}
      </div>

      <p>{plan.title}</p>
      <p className="text-sm text-muted-foreground">
        {longDate(plan.startDate, locale)} → {longDate(plan.endDate, locale)}
        {!single && ` · ${t("tasks", { count: plan.taskCount })}`}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {plan.action && plan.action.evidence.length > 0 ? (
            plan.action.evidence.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                onClick={async () => {
                  const res = await getTaskEvidenceUrl(ev.id);
                  if (res.success && res.data) window.open(res.data.url, "_blank", "noopener");
                  else toast.error(res.error ?? "");
                }}
              >
                <Paperclip className="h-3 w-3" />
                {ev.fileName}
              </button>
            ))
          ) : (
            <span className="italic text-muted-foreground">{t("no_evidence")}</span>
          )}
          {single && canEdit && open && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                {t("attach")}
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !plan.action) return;
                  if (file.size > MAX_EVIDENCE_BYTES) {
                    toast.error(tl("errors.file_too_large", { max: MAX_EVIDENCE_MB }));
                    return;
                  }
                  const fd = new FormData();
                  fd.append("file", file);
                  run(() => uploadTaskEvidence(plan.action!.taskId, fd));
                }}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!single && planDetailBase && (
            <Button asChild size="sm" variant="ghost">
              <Link href={`${planDetailBase}${plan.id}`}>{t("open_full")}</Link>
            </Button>
          )}
          {single && canEdit && open && (
            <Button size="sm" variant="secondary" className="rounded-full" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {t("edit")}
            </Button>
          )}
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={t("delete")}
              disabled={pending}
              onClick={() => {
                if (!confirm(t("delete_confirm"))) return;
                run(() => deleteSingleActionPlan(plan.id), t("deleted"));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
