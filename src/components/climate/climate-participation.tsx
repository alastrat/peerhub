"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParticipationGroup, SurveyParticipation } from "@/lib/utils/climate-participation";

const DEMOGRAPHICS = ["gender", "generation", "tenure"] as const;

function percent(answered: number, invited: number) {
  return invited > 0 ? Math.round((answered / invited) * 100) : 0;
}

function ParticipationHead({ group }: { group: string }) {
  const t = useTranslations("climate_scoring.participation");
  return (
    <thead>
      <tr className="text-muted-foreground">
        <th className="px-3 py-2 text-left font-medium">{group}</th>
        <th className="px-3 py-2 text-right font-medium">{t("col_answered")}</th>
        <th className="px-3 py-2 text-right font-medium">{t("col_not_answered")}</th>
        <th className="px-3 py-2 text-right font-medium">{t("col_invited")}</th>
        <th className="px-3 py-2 text-left font-medium">{t("col_progress")}</th>
      </tr>
    </thead>
  );
}

function ParticipationRows({
  groups,
  label,
}: {
  groups: ParticipationGroup[];
  label: (group: ParticipationGroup) => string;
}) {
  return groups.map((g) => {
    const done = percent(g.answered, g.invited);
    return (
      <tr key={g.id ?? "none"} className="border-t break-inside-avoid">
        <td className="px-3 py-2 font-medium">{label(g)}</td>
        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
          {g.answered} <span className="text-xs text-muted-foreground">({done}%)</span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
          {g.invited - g.answered} <span className="text-xs text-muted-foreground">({100 - done}%)</span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{g.invited}</td>
        <td className="px-3 py-2">
          <div className="h-2 w-24 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-green-500" style={{ width: `${done}%` }} />
          </div>
        </td>
      </tr>
    );
  });
}

/**
 * Answered / invited per leader (each person's direct manager). One
 * self-contained section, shown in the Análisis tab and the general report.
 */
export function LeaderProgress({ leaders }: { leaders: ParticipationGroup[] }) {
  const t = useTranslations("climate_scoring.participation");
  if (leaders.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leaders_title")}</CardTitle>
        <CardDescription>{t("leaders_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table data-participation className="w-full text-sm">
          <ParticipationHead group={t("col_leader")} />
          <tbody>
            <ParticipationRows groups={leaders} label={(g) => g.name ?? t("no_leader")} />
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/** Answered vs. not answered per gender, generation and tenure: the only place demographics show. */
export function DemographicParticipation({ participation }: { participation: SurveyParticipation }) {
  const t = useTranslations("climate_scoring.participation");
  const td = useTranslations("demographics");
  // Nothing to show when nobody invited has demographic data in Personas
  if (DEMOGRAPHICS.every((type) => participation[type].every((g) => g.id == null))) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("demographics_title")}</CardTitle>
        <CardDescription>{t("demographics_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table data-participation className="w-full text-sm">
          <ParticipationHead group={t("col_group")} />
          {DEMOGRAPHICS.map((type) => (
            <tbody key={type}>
              <tr className="border-t bg-muted/40 break-after-avoid">
                <th
                  colSpan={5}
                  className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t(type)}
                </th>
              </tr>
              <ParticipationRows
                groups={participation[type]}
                label={(g) => (g.id ? td(`${type}.${g.id}`) : t("no_data"))}
              />
            </tbody>
          ))}
        </table>
      </CardContent>
    </Card>
  );
}
