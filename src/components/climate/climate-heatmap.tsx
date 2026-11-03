"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { SegmentResult } from "@/lib/queries/climate-reports";
import { BAND_STYLES, formatMean } from "./climate-score-ui";

interface ClimateHeatmapProps {
  title: string;
  segments: SegmentResult[];
  dimensions: { id: string; name: string }[];
  minGroupSize: number;
  /** Display name for a segment (demographic groups are stored as keys). */
  segmentLabel?: (segment: SegmentResult) => string;
}

/** Groups × dimensions. Groups under the minimum size show as one locked row. */
export function ClimateHeatmap({ title, segments, dimensions, minGroupSize, segmentLabel }: ClimateHeatmapProps) {
  const t = useTranslations("climate_scoring");
  if (segments.length === 0 || dimensions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{t("heatmap_desc", { min: minGroupSize })}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("heatmap_group")}</th>
              <th className="px-3 py-2 text-center font-medium">{t("heatmap_index")}</th>
              {dimensions.map((d) => (
                <th key={d.id} className="px-3 py-2 text-center font-medium">
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const cells = new Map(s.dimensions.map((c) => [c.dimensionId, c]));
              return (
                <tr key={s.segmentId} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {segmentLabel ? segmentLabel(s) : s.segmentName}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({s.respondents})</span>
                  </td>
                  {s.suppressed ? (
                    <td colSpan={dimensions.length + 1} className="px-3 py-2 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Lock className="h-3.5 w-3.5" />
                        {t("suppressed_cell", { min: minGroupSize })}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td
                        className={cn(
                          "px-3 py-2 text-center font-semibold tabular-nums",
                          s.index?.band && BAND_STYLES[s.index.band].cell,
                        )}
                      >
                        {formatMean(s.index?.mean)}
                      </td>
                      {dimensions.map((d) => {
                        const c = cells.get(d.id);
                        return (
                          <td
                            key={d.id}
                            className={cn(
                              "px-3 py-2 text-center tabular-nums",
                              c?.band ? BAND_STYLES[c.band].cell : "text-muted-foreground",
                            )}
                          >
                            {formatMean(c?.mean)}
                          </td>
                        );
                      })}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
