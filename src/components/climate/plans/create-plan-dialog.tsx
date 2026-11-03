"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { createActionPlan } from "@/lib/actions/action-plans";
import { CLIMATE_BANDS, bandRank, nextBand, type ClimateBand } from "@/lib/utils/climate-scoring";
import { BandBadge, formatMean } from "../climate-score-ui";
import { NativeSelect, toDateInput } from "./plan-ui";

type Scope = "LEADER" | "DEPARTMENT" | "HUB" | "TEAM" | "ORGANIZATION";

export interface PlanDimensionOption {
  dimensionId: string;
  dimensionName: string;
  mean: number | null;
  band: ClimateBand | null;
}

interface CreatePlanDialogProps {
  surveyId: string;
  /** Dimensions the plan can target (instrument dimensions with a score). */
  dimensions: PlanDimensionOption[];
  /** Pre-selected dimension (e.g. from a gap card). */
  defaultDimensionId?: string;
  /** Leader mode: scope fixed to the leader's team. */
  fixedScope?: { scope: "LEADER"; scopeRefId: string };
  /** Admin mode: groups and owners to choose from. */
  groups?: Partial<Record<Exclude<Scope, "ORGANIZATION">, { id: string; name: string }[]>>;
  employees?: { id: string; name: string }[];
  /** Where to go after creating; receives the new plan id. */
  planHref: (planId: string) => string;
  trigger?: React.ReactNode;
}

export function CreatePlanDialog({
  surveyId,
  dimensions,
  defaultDimensionId,
  fixedScope,
  groups,
  employees,
  planHref,
  trigger,
}: CreatePlanDialogProps) {
  const t = useTranslations("climate_plans");
  const tb = useTranslations("climate_scoring.bands");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const today = new Date();
  const defaultEnd = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const [scope, setScope] = useState<Scope>(fixedScope?.scope ?? "ORGANIZATION");
  const [scopeRefId, setScopeRefId] = useState(fixedScope?.scopeRefId ?? "");
  const [ownerEmployeeId, setOwner] = useState("");
  const [dimensionId, setDimensionId] = useState(defaultDimensionId ?? dimensions[0]?.dimensionId ?? "");
  const dim = dimensions.find((d) => d.dimensionId === dimensionId);
  const [targetBand, setTargetBand] = useState<ClimateBand | "">("");
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState(toDateInput(today));
  const [endDate, setEndDate] = useState(toDateInput(defaultEnd));

  const effectiveTarget: ClimateBand | "" = targetBand || (dim?.band ? nextBand(dim.band) : "");
  const targetOptions = useMemo(
    () => (dim?.band ? CLIMATE_BANDS.filter((b) => bandRank(b) >= bandRank(dim.band!)) : CLIMATE_BANDS),
    [dim],
  );
  const scopeGroups = scope !== "ORGANIZATION" ? groups?.[scope] ?? [] : [];

  function submit() {
    startTransition(async () => {
      const res = await createActionPlan({
        surveyId,
        dimensionId,
        scope,
        scopeRefId: scope === "ORGANIZATION" ? null : scopeRefId,
        ownerEmployeeId: ownerEmployeeId || null,
        title,
        objective,
        targetBand: effectiveTarget || undefined,
        startDate,
        endDate,
      });
      if (!res.success || !res.data) {
        toast.error(res.error ?? t("error_generic"));
        return;
      }
      toast.success(t("created"));
      setOpen(false);
      router.push(planHref(res.data.id));
    });
  }

  const canSubmit =
    !!dimensionId &&
    title.trim().length > 0 &&
    objective.trim().length > 0 &&
    !!startDate &&
    !!endDate &&
    (scope === "ORGANIZATION" || !!scopeRefId) &&
    (!!fixedScope || scope === "LEADER" || !!ownerEmployeeId || !employees);

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("new_plan")}
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("new_plan")}</DialogTitle>
            <DialogDescription>{t("new_plan_desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!fixedScope && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cp-scope">{t("field_scope")}</Label>
                  <NativeSelect
                    id="cp-scope"
                    value={scope}
                    onChange={(e) => {
                      setScope(e.target.value as Scope);
                      setScopeRefId("");
                    }}
                  >
                    <option value="ORGANIZATION">{t("scope.ORGANIZATION")}</option>
                    {(["DEPARTMENT", "HUB", "TEAM", "LEADER"] as const)
                      .filter((s) => (groups?.[s]?.length ?? 0) > 0)
                      .map((s) => (
                        <option key={s} value={s}>
                          {t(`scope.${s}`)}
                        </option>
                      ))}
                  </NativeSelect>
                </div>
                {scope !== "ORGANIZATION" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cp-group">{t("field_group")}</Label>
                    <NativeSelect id="cp-group" value={scopeRefId} onChange={(e) => setScopeRefId(e.target.value)}>
                      <option value="">{t("choose")}</option>
                      {scopeGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cp-dimension">{t("field_dimension")}</Label>
              <NativeSelect
                id="cp-dimension"
                value={dimensionId}
                onChange={(e) => {
                  setDimensionId(e.target.value);
                  setTargetBand("");
                }}
              >
                {dimensions.map((d) => (
                  <option key={d.dimensionId} value={d.dimensionId}>
                    {d.dimensionName}
                    {d.mean != null ? ` — ${formatMean(d.mean)}` : ""}
                  </option>
                ))}
              </NativeSelect>
              {dim?.band && !fixedScope && scope !== "ORGANIZATION" && (
                <p className="text-xs text-muted-foreground">{t("baseline_from_group")}</p>
              )}
              {dim?.band && (fixedScope || scope === "ORGANIZATION") && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {t("baseline")}: {formatMean(dim.mean)} <BandBadge band={dim.band} />
                </p>
              )}
            </div>

            {!fixedScope && employees && scope !== "LEADER" && (
              <div className="space-y-1.5">
                <Label htmlFor="cp-owner">{t("owner")}</Label>
                <NativeSelect id="cp-owner" value={ownerEmployeeId} onChange={(e) => setOwner(e.target.value)}>
                  <option value="">{t("choose")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cp-title">{t("field_title")}</Label>
              <Input id="cp-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("title_placeholder")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-objective">{t("field_objective")}</Label>
              <Textarea
                id="cp-objective"
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder={t("objective_placeholder")}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cp-target">{t("field_target")}</Label>
                <NativeSelect id="cp-target" value={effectiveTarget} onChange={(e) => setTargetBand(e.target.value as ClimateBand)}>
                  {targetOptions.map((b) => (
                    <option key={b} value={b}>
                      {tb(b)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-start">{t("field_start")}</Label>
                <Input id="cp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-end">{t("field_end")}</Label>
                <Input id="cp-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button disabled={pending || !canSubmit} onClick={submit}>
              {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("create_draft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
