"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSurveySettings } from "@/lib/actions/climate-surveys";
import { CLIMATE_BANDS, type ClimateBand } from "@/lib/utils/climate-scoring";
import { NativeSelect, toDateInput } from "./plan-ui";

interface PlanSettingsCardProps {
  surveyId: string;
  initial: {
    goalBand: ClimateBand;
    planMinPerLeader: number;
    planDueDate: Date | null;
    followUpUserIds: string[];
  };
  /** Company admins who can follow up on plans. */
  users: { id: string; name: string | null; email: string }[];
}

export function PlanSettingsCard({ surveyId, initial, users }: PlanSettingsCardProps) {
  const t = useTranslations("climate_plans.settings");
  const tb = useTranslations("climate_scoring.bands");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [goalBand, setGoalBand] = useState<ClimateBand>(initial.goalBand);
  const [planMin, setPlanMin] = useState(String(initial.planMinPerLeader));
  const [due, setDue] = useState(toDateInput(initial.planDueDate));
  const [followUps, setFollowUps] = useState<string[]>(initial.followUpUserIds);

  function save() {
    startTransition(async () => {
      const res = await updateSurveySettings(surveyId, {
        goalBand,
        planMinPerLeader: Number(planMin),
        planDueDate: due || null,
        followUpUserIds: followUps,
      });
      if (!res.success) {
        toast.error(res.error ?? t("error"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ps-goal">{t("goal")}</Label>
            <NativeSelect id="ps-goal" value={goalBand} onChange={(e) => setGoalBand(e.target.value as ClimateBand)}>
              {CLIMATE_BANDS.filter((b) => b !== "MUY_DESFAVORABLE").map((b) => (
                <option key={b} value={b}>
                  {tb(b)}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">{t("goal_hint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ps-min">{t("plan_min")}</Label>
            <Input id="ps-min" type="number" min={0} max={12} value={planMin} onChange={(e) => setPlanMin(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("plan_min_hint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ps-due">{t("due")}</Label>
            <Input id="ps-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("due_hint")}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{t("follow_up")}</Label>
          <p className="text-xs text-muted-foreground">{t("follow_up_hint")}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={followUps.includes(u.id)}
                  onChange={(e) =>
                    setFollowUps(e.target.checked ? [...followUps, u.id] : followUps.filter((x) => x !== u.id))
                  }
                />
                {u.name ?? u.email} <span className="text-xs text-muted-foreground">{u.email}</span>
              </label>
            ))}
          </div>
        </div>
        <Button onClick={save} disabled={pending || planMin === "" || Number.isNaN(Number(planMin))}>
          {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
