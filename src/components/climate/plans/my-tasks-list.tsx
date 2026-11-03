"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, ListChecks, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addActionPlanNote, setActionPlanTaskStatus } from "@/lib/actions/action-plans";
import type { getMyPlans, getMyTasks } from "@/lib/queries/action-plans";
import { NativeSelect, PlanStatusBadge, ProgressBar, formatDay } from "./plan-ui";

type Tasks = Awaited<ReturnType<typeof getMyTasks>>;
type Plans = Awaited<ReturnType<typeof getMyPlans>>;

export function MyTasksList({ tasks, plans }: { tasks: Tasks; plans: Plans }) {
  const t = useTranslations("climate_plans");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  function run(fn: () => Promise<{ success: boolean; error?: string }>, ok?: string, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (!res.success) {
        toast.error(res.error ?? t("error_generic"));
        return;
      }
      if (ok) toast.success(ok);
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ListChecks className="h-6 w-6 text-primary" />
        {t("my_tasks_title")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("my_tasks_open")}</CardTitle>
          <CardDescription>{t("my_tasks_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">{t("my_tasks_empty")}</p>}
          {tasks.map((task) => (
            <div key={task.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/portal/climate-plans/${task.plan.id}`} className="font-medium hover:underline">
                    {task.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {task.plan.title} · {task.plan.dimension.name} · {task.plan.survey.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("task_due_on", { date: formatDay(task.dueDate, locale) })}
                    {task.overdue && <span className="ml-1 font-medium text-red-600">· {t("overdue")}</span>}
                    {task._count.evidence > 0 && (
                      <span className="ml-1 inline-flex items-center gap-0.5">
                        · <Paperclip className="h-3 w-3" /> {task._count.evidence}
                      </span>
                    )}
                  </p>
                </div>
                <NativeSelect
                  aria-label={t("task_status_label")}
                  className="h-8 w-40"
                  value={task.status}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => setActionPlanTaskStatus(task.id, e.target.value as "PENDING" | "IN_PROGRESS" | "DONE"), t("task_updated"))
                  }
                >
                  {(["PENDING", "IN_PROGRESS", "DONE"] as const).map((s) => (
                    <option key={s} value={s}>
                      {t(`task_status.${s}`)}
                    </option>
                  ))}
                  {task.status === "CANCELLED" && <option value="CANCELLED">{t("task_status.CANCELLED")}</option>}
                </NativeSelect>
              </div>
              <div className="flex gap-2">
                <Input
                  className="h-8"
                  placeholder={t("task_note_placeholder")}
                  value={notes[task.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [task.id]: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={pending || !(notes[task.id] ?? "").trim()}
                  onClick={() =>
                    run(() => addActionPlanNote(task.plan.id, notes[task.id], task.id), t("note_added"), () =>
                      setNotes({ ...notes, [task.id]: "" }),
                    )
                  }
                >
                  {t("add_note")}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("my_plans_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plans.map((p) => (
              <Link
                key={p.id}
                href={`/portal/climate-plans/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.dimension.name} · {p.survey.name}
                    {p.overdueTasks > 0 && <span className="ml-1 text-red-600">· {t("overdue_count", { count: p.overdueTasks })}</span>}
                  </p>
                </div>
                <div className="flex w-56 items-center gap-2">
                  <ProgressBar pct={p.progress.pct} />
                  <PlanStatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
