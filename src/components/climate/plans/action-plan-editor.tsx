"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addActionPlanNote,
  addActionPlanTask,
  addProcessMeasure,
  cancelActionPlan,
  completeActionPlan,
  deleteActionPlan,
  deleteActionPlanTask,
  deleteProcessMeasure,
  deleteTaskEvidence,
  getTaskEvidenceUrl,
  recordMeasureValue,
  setActionPlanTaskStatus,
  submitActionPlan,
  updateActionPlan,
  uploadTaskEvidence,
} from "@/lib/actions/action-plans";
import type { PlanDetail } from "@/lib/queries/action-plans";
import { CLIMATE_BANDS, bandRank, type ClimateBand } from "@/lib/utils/climate-scoring";
import { BandBadge, formatMean, formatPct } from "../climate-score-ui";
import {
  ImpactBadge,
  NativeSelect,
  PlanStatusBadge,
  ProgressBar,
  TaskStatusBadge,
  formatDay,
  toDateInput,
} from "./plan-ui";

type Result = { success: boolean; error?: string };

export interface PlanEditorPermissions {
  canManage: boolean;
  isAdmin: boolean;
  viewerEmployeeId: string | null;
}

interface ActionPlanEditorProps {
  plan: PlanDetail;
  permissions: PlanEditorPermissions;
  /** People who can own the plan or its tasks. */
  employees: { id: string; name: string }[];
  backHref: string;
  /** After delete, where to go. */
  afterDeleteHref: string;
}

const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

export function ActionPlanEditor({ plan, permissions, employees, backHref, afterDeleteHref }: ActionPlanEditorProps) {
  const t = useTranslations("climate_plans");
  const tb = useTranslations("climate_scoring.bands");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isOpen = plan.status === "DRAFT" || plan.status === "ACTIVE";
  const isActive = plan.status === "ACTIVE";
  const canEdit = permissions.canManage && isOpen;
  const outcome = plan.measures.find((m) => m.kind === "OUTCOME");
  const processMeasures = plan.measures.filter((m) => m.kind === "PROCESS");

  function run(action: () => Promise<Result>, success?: string, after?: () => void) {
    startTransition(async () => {
      const res = await action();
      if (!res.success) {
        toast.error(res.error ?? t("error_generic"));
        return;
      }
      if (success) toast.success(success);
      after?.();
      router.refresh();
    });
  }

  // ---- plan fields --------------------------------------------------------
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: plan.title,
    objective: plan.objective,
    targetBand: plan.targetBand as ClimateBand,
    startDate: toDateInput(plan.startDate),
    endDate: toDateInput(plan.endDate),
    ownerEmployeeId: plan.ownerEmployeeId,
  });

  // ---- dialogs ------------------------------------------------------------
  const [completeOpen, setCompleteOpen] = useState(false);
  const [closingNote, setClosingNote] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ---- new task -----------------------------------------------------------
  const emptyTask = { title: "", description: "", ownerEmployeeId: "", dueDate: toDateInput(plan.endDate) };
  const [newTask, setNewTask] = useState(emptyTask);
  const [newMeasure, setNewMeasure] = useState({ name: "", unit: "", baselineValue: "", targetValue: "" });
  const [note, setNote] = useState("");

  const bandsFromBaseline = CLIMATE_BANDS.filter((b) => bandRank(b) >= bandRank(plan.baselineBand as ClimateBand));
  const isTaskOwner = (ownerId: string | null) => !!ownerId && ownerId === permissions.viewerEmployeeId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <div className="flex flex-wrap gap-2">
          {permissions.canManage && plan.status === "DRAFT" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (!confirm(t("delete_confirm"))) return;
                  run(() => deleteActionPlan(plan.id), t("deleted"), () => router.push(afterDeleteHref));
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("delete")}
              </Button>
              <Button size="sm" disabled={pending} onClick={() => run(() => submitActionPlan(plan.id), t("submitted"))}>
                {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                {t("submit")}
              </Button>
            </>
          )}
          {permissions.canManage && isActive && (
            <Button size="sm" disabled={pending} onClick={() => setCompleteOpen(true)}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {t("complete")}
            </Button>
          )}
          {permissions.isAdmin && isOpen && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setCancelOpen(true)}>
              <XCircle className="mr-1.5 h-4 w-4" />
              {t("cancel_plan")}
            </Button>
          )}
        </div>
      </div>

      {/* Header ------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <PlanStatusBadge status={plan.status} />
                <span className="text-sm text-muted-foreground">
                  {plan.dimension.name} · {t(`scope.${plan.scope}`)}
                  {plan.scopeName ? `: ${plan.scopeName}` : ""} · {plan.survey.name}
                </span>
              </div>
              <CardTitle className="text-xl">{plan.title}</CardTitle>
              <CardDescription>
                {t("owner")}: {plan.owner.name} · <CalendarDays className="inline h-3.5 w-3.5" />{" "}
                {formatDay(plan.startDate, locale)} → {formatDay(plan.endDate, locale)}
              </CardDescription>
            </div>
            {canEdit && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                {t("edit")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="plan-title">{t("field_title")}</Label>
                <Input id="plan-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="plan-objective">{t("field_objective")}</Label>
                <Textarea
                  id="plan-objective"
                  rows={3}
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-start">{t("field_start")}</Label>
                <Input id="plan-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-end">{t("field_end")}</Label>
                <Input id="plan-end" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-target">{t("field_target")}</Label>
                <NativeSelect
                  id="plan-target"
                  value={form.targetBand}
                  onChange={(e) => setForm({ ...form, targetBand: e.target.value as ClimateBand })}
                >
                  {bandsFromBaseline.map((b) => (
                    <option key={b} value={b}>
                      {tb(b)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {permissions.isAdmin && (
                <div className="space-y-1.5">
                  <Label htmlFor="plan-owner">{t("owner")}</Label>
                  <NativeSelect
                    id="plan-owner"
                    value={form.ownerEmployeeId}
                    onChange={(e) => setForm({ ...form, ownerEmployeeId: e.target.value })}
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
              <div className="flex gap-2 md:col-span-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        updateActionPlan(plan.id, {
                          title: form.title,
                          objective: form.objective,
                          targetBand: form.targetBand,
                          startDate: form.startDate,
                          endDate: form.endDate,
                          ...(permissions.isAdmin ? { ownerEmployeeId: form.ownerEmployeeId } : {}),
                        }),
                      t("saved"),
                      () => setEditing(false),
                    )
                  }
                >
                  {t("save")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{plan.objective}</p>
          )}

          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("baseline")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">{formatMean(plan.baselineMean)}</span>
                <BandBadge band={plan.baselineBand as ClimateBand} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("baseline_detail", { fav: formatPct(plan.baselineFavorability), n: plan.baselineN })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("target")}</p>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <BandBadge band={plan.targetBand as ClimateBand} />
                {plan.targetMean != null && <span className="text-sm tabular-nums">≥ {formatMean(plan.targetMean)}</span>}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-muted-foreground">{t("result")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <ImpactBadge impact={plan.impact} />
                {outcome?.resultMean != null && (
                  <>
                    <span className="text-sm tabular-nums">{formatMean(outcome.resultMean)}</span>
                    <BandBadge band={outcome.resultBand as ClimateBand | null} />
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {plan.impact == null ? t("result_pending") : t("result_n", { n: outcome?.resultN ?? 0 })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="whitespace-nowrap text-muted-foreground">
              {t("progress", { done: plan.progress.done, total: plan.progress.total })}
            </span>
            <ProgressBar pct={plan.progress.pct} />
            {plan.overdueTasks > 0 && (
              <span className="whitespace-nowrap text-xs font-medium text-red-600">
                {t("overdue_count", { count: plan.overdueTasks })}
              </span>
            )}
          </div>

          {plan.status === "COMPLETED" && plan.closingNote && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <p className="font-medium">{t("closing_note")}</p>
              <p className="whitespace-pre-wrap">{plan.closingNote}</p>
            </div>
          )}
          {plan.status === "CANCELLED" && plan.cancelReason && (
            <div className="rounded-md border bg-muted p-3 text-sm">
              <p className="font-medium">{t("cancel_reason")}</p>
              <p className="whitespace-pre-wrap">{plan.cancelReason}</p>
            </div>
          )}
          {plan.status === "DRAFT" && <p className="text-sm text-muted-foreground">{t("draft_hint")}</p>}
        </CardContent>
      </Card>

      {/* Tasks ------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("tasks_title")}</CardTitle>
          <CardDescription>{t("tasks_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.tasks.length === 0 && <p className="text-sm text-muted-foreground">{t("no_tasks")}</p>}
          {plan.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              planActive={isActive}
              canManage={canEdit}
              canProgress={(permissions.canManage || isTaskOwner(task.ownerEmployeeId)) && isActive}
              canAttach={(permissions.canManage || isTaskOwner(task.ownerEmployeeId)) && isOpen}
              viewerEmployeeId={permissions.viewerEmployeeId}
              pending={pending}
              run={run}
              locale={locale}
            />
          ))}

          {canEdit && (
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium">{t("add_task")}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="task-title">{t("task_title")}</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    placeholder={t("task_title_placeholder")}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-owner">{t("task_owner")}</Label>
                  <NativeSelect
                    id="task-owner"
                    value={newTask.ownerEmployeeId}
                    onChange={(e) => setNewTask({ ...newTask, ownerEmployeeId: e.target.value })}
                  >
                    <option value="">{t("task_owner_plan")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-due">{t("task_due")}</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label htmlFor="task-desc">{t("task_description")}</Label>
                  <Textarea
                    id="task-desc"
                    rows={2}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
              </div>
              <Button
                size="sm"
                disabled={pending || !newTask.title.trim() || !newTask.dueDate}
                onClick={() =>
                  run(
                    () =>
                      addActionPlanTask(plan.id, {
                        title: newTask.title,
                        description: newTask.description || null,
                        ownerEmployeeId: newTask.ownerEmployeeId || null,
                        dueDate: newTask.dueDate,
                      }),
                    t("task_added"),
                    () => setNewTask(emptyTask),
                  )
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t("add_task_button")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicators -------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("measures_title")}</CardTitle>
          <CardDescription>{t("measures_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {outcome && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {outcome.name} <span className="text-xs font-normal text-muted-foreground">· {t("measure_outcome")}</span>
                </p>
                <p className="text-xs text-muted-foreground">{t("measure_outcome_hint")}</p>
              </div>
              <span className="tabular-nums">
                {formatMean(outcome.baselineValue)} → {outcome.resultMean != null ? formatMean(outcome.resultMean) : "…"}
              </span>
            </div>
          )}
          {processMeasures.map((m) => (
            <MeasureRow
              key={m.id}
              measure={m}
              canManage={canEdit}
              canRecord={
                isActive &&
                (permissions.canManage ||
                  (!!m.taskId && plan.tasks.some((t) => t.id === m.taskId && isTaskOwner(t.ownerEmployeeId))))
              }
              pending={pending}
              run={run}
            />
          ))}
          {canEdit && (
            <div className="grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-5">
              <Input
                className="md:col-span-2"
                placeholder={t("measure_name")}
                value={newMeasure.name}
                onChange={(e) => setNewMeasure({ ...newMeasure, name: e.target.value })}
              />
              <Input placeholder={t("measure_unit")} value={newMeasure.unit} onChange={(e) => setNewMeasure({ ...newMeasure, unit: e.target.value })} />
              <Input
                type="number"
                placeholder={t("measure_baseline")}
                value={newMeasure.baselineValue}
                onChange={(e) => setNewMeasure({ ...newMeasure, baselineValue: e.target.value })}
              />
              <Input
                type="number"
                placeholder={t("measure_target")}
                value={newMeasure.targetValue}
                onChange={(e) => setNewMeasure({ ...newMeasure, targetValue: e.target.value })}
              />
              <Button
                size="sm"
                className="md:col-span-5 md:w-fit"
                variant="outline"
                disabled={pending || !newMeasure.name.trim()}
                onClick={() =>
                  run(
                    () =>
                      addProcessMeasure(plan.id, {
                        name: newMeasure.name,
                        unit: newMeasure.unit || null,
                        baselineValue: newMeasure.baselineValue === "" ? null : Number(newMeasure.baselineValue),
                        targetValue: newMeasure.targetValue === "" ? null : Number(newMeasure.targetValue),
                      }),
                    t("measure_added"),
                    () => setNewMeasure({ name: "", unit: "", baselineValue: "", targetValue: "" }),
                  )
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t("add_measure")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity ---------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("activity_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {permissions.canManage && isActive && (
            <div className="flex gap-2">
              <Input placeholder={t("note_placeholder")} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !note.trim()}
                onClick={() => run(() => addActionPlanNote(plan.id, note), undefined, () => setNote(""))}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                {t("add_note")}
              </Button>
            </div>
          )}
          {plan.updates.length === 0 && <p className="text-sm text-muted-foreground">{t("no_activity")}</p>}
          <ul className="space-y-2">
            {plan.updates.map((u) => {
              const task = u.taskId ? plan.tasks.find((x) => x.id === u.taskId) : undefined;
              const measure = u.measureId ? plan.measures.find((x) => x.id === u.measureId) : undefined;
              return (
                <li key={u.id} className="border-l-2 pl-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {u.authorName} · {new Date(u.createdAt).toLocaleString(locale === "en" ? "en-US" : "es-CO")}
                    {task ? ` · ${task.title}` : ""}
                    {measure ? ` · ${measure.name}` : ""}
                  </p>
                  {u.statusTo && (
                    <p className="text-xs">
                      {u.statusFrom ? `${t(`any_status.${u.statusFrom}`)} → ` : ""}
                      {t(`any_status.${u.statusTo}`)}
                    </p>
                  )}
                  {u.value != null && <p className="text-xs tabular-nums">{t("value_recorded", { value: u.value })}</p>}
                  {u.note && <p className="whitespace-pre-wrap">{u.note}</p>}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Complete dialog --------------------------------------------------- */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("complete_title")}</DialogTitle>
            <DialogDescription>{t("complete_desc")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={closingNote} onChange={(e) => setClosingNote(e.target.value)} placeholder={t("closing_note_placeholder")} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={pending || !closingNote.trim()}
              onClick={() => run(() => completeActionPlan(plan.id, closingNote), t("completed"), () => setCompleteOpen(false))}
            >
              {t("complete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog ----------------------------------------------------- */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancel_title")}</DialogTitle>
            <DialogDescription>{t("cancel_desc")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !cancelReason.trim()}
              onClick={() => run(() => cancelActionPlan(plan.id, cancelReason), t("cancelled"), () => setCancelOpen(false))}
            >
              {t("cancel_plan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

function TaskRow({
  task,
  canManage,
  canProgress,
  canAttach,
  viewerEmployeeId,
  pending,
  run,
  locale,
}: {
  task: PlanDetail["tasks"][number];
  planActive: boolean;
  canManage: boolean;
  canProgress: boolean;
  canAttach: boolean;
  viewerEmployeeId: string | null;
  pending: boolean;
  run: (action: () => Promise<Result>, success?: string, after?: () => void) => void;
  locale: string;
}) {
  const t = useTranslations("climate_plans");
  const [taskNote, setTaskNote] = useState("");
  const overdue =
    task.status !== "DONE" &&
    task.status !== "CANCELLED" &&
    new Date(task.dueDate).toISOString().slice(0, 10) < new Date().toLocaleDateString("en-CA");

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.owner?.name ?? t("task_owner_plan")} · {t("task_due_on", { date: formatDay(task.dueDate, locale) })}
            {overdue && <span className="ml-1 font-medium text-red-600">· {t("overdue")}</span>}
          </p>
          {task.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canProgress ? (
            <NativeSelect
              aria-label={t("task_status_label")}
              className="h-8 w-40"
              value={task.status}
              disabled={pending}
              onChange={(e) =>
                run(() => setActionPlanTaskStatus(task.id, e.target.value as (typeof TASK_STATUSES)[number]), t("task_updated"))
              }
            >
              {TASK_STATUSES.filter((s) => s !== "CANCELLED" || canManage || task.status === "CANCELLED").map((s) => (
                <option key={s} value={s}>
                  {t(`task_status.${s}`)}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <TaskStatusBadge status={task.status} />
          )}
          {canManage && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={t("delete_task")}
              disabled={pending}
              onClick={() => {
                if (!confirm(t("delete_task_confirm"))) return;
                run(() => deleteActionPlanTask(task.id), t("task_deleted"));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {(task.evidence.length > 0 || canAttach) && (
        <div className="flex flex-wrap items-center gap-2">
          {task.evidence.map((ev) => (
            <span key={ev.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <button
                type="button"
                className="hover:underline"
                onClick={async () => {
                  const res = await getTaskEvidenceUrl(ev.id);
                  if (res.success && res.data) window.open(res.data.url, "_blank", "noopener");
                  else toast.error(res.error ?? t("error_generic"));
                }}
              >
                {ev.fileName}
              </button>
              {(canManage || (!!viewerEmployeeId && ev.uploadedByEmployeeId === viewerEmployeeId)) && canAttach && (
                <button
                  type="button"
                  aria-label={t("delete_file")}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => run(() => deleteTaskEvidence(ev.id), t("file_deleted"))}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {canAttach && (
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
              <Paperclip className="h-3.5 w-3.5" />
              {t("attach")}
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  run(() => uploadTaskEvidence(task.id, fd), t("file_uploaded"));
                }}
              />
            </label>
          )}
        </div>
      )}

      {canProgress && (
        <div className="flex gap-2">
          <Input
            className="h-8"
            placeholder={t("task_note_placeholder")}
            value={taskNote}
            onChange={(e) => setTaskNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={pending || !taskNote.trim()}
            onClick={() => run(() => addActionPlanNote(task.planId, taskNote, task.id), undefined, () => setTaskNote(""))}
          >
            {t("add_note")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process measure row
// ---------------------------------------------------------------------------

function MeasureRow({
  measure,
  canManage,
  canRecord,
  pending,
  run,
}: {
  measure: PlanDetail["measures"][number];
  canManage: boolean;
  canRecord: boolean;
  pending: boolean;
  run: (action: () => Promise<Result>, success?: string, after?: () => void) => void;
}) {
  const t = useTranslations("climate_plans");
  const [value, setValue] = useState("");
  const unit = measure.unit ? ` ${measure.unit}` : "";
  const show = (v: number | null) => (v == null ? "—" : `${v}${unit}`);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
      <div>
        <p className="font-medium">{measure.name}</p>
        <p className="text-xs text-muted-foreground">
          {t("measure_values", { baseline: show(measure.baselineValue), target: show(measure.targetValue), current: show(measure.currentValue) })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {canRecord && (
          <>
            <Input type="number" className="h-8 w-24" value={value} onChange={(e) => setValue(e.target.value)} aria-label={t("record_value")} />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={pending || value === "" || Number.isNaN(Number(value))}
              onClick={() => run(() => recordMeasureValue(measure.id, Number(value)), t("value_saved"), () => setValue(""))}
            >
              {t("record_value")}
            </Button>
          </>
        )}
        {canManage && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t("delete_measure")}
            disabled={pending}
            onClick={() => run(() => deleteProcessMeasure(measure.id), t("measure_deleted"))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
