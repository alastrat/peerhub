"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSurveySettings } from "@/lib/actions/climate-surveys";
import { storedCoverText } from "@/lib/utils/climate-report";

interface ReportCoverCardProps {
  surveyId: string;
  initial: {
    reportExtraDuration: string | null;
    reportScaleText: string | null;
    reportIntroText: string | null;
  };
  /** What the cover shows while a field is empty, in the company's language. */
  defaults: { scaleText: string; introText: string };
}

/** "Portada del informe": the cover of the printable climate report. */
export function ReportCoverCard({ surveyId, initial, defaults }: ReportCoverCardProps) {
  const t = useTranslations("climate_report.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [extraDuration, setExtraDuration] = useState(initial.reportExtraDuration ?? "");
  // Prefilled with the defaults so admins edit from them, like the POC
  const [scaleText, setScaleText] = useState(initial.reportScaleText ?? defaults.scaleText);
  const [introText, setIntroText] = useState(initial.reportIntroText ?? defaults.introText);

  function save() {
    startTransition(async () => {
      const res = await updateSurveySettings(surveyId, {
        reportExtraDuration: extraDuration,
        reportScaleText: storedCoverText(scaleText, defaults.scaleText),
        reportIntroText: storedCoverText(introText, defaults.introText),
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
        <div className="space-y-1.5">
          <Label htmlFor="rc-extra">{t("extra_duration")}</Label>
          <Input
            id="rc-extra"
            value={extraDuration}
            maxLength={120}
            placeholder={t("extra_duration_placeholder")}
            onChange={(e) => setExtraDuration(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("extra_duration_hint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-scale">{t("scale")}</Label>
          <Input
            id="rc-scale"
            value={scaleText}
            maxLength={300}
            placeholder={defaults.scaleText}
            onChange={(e) => setScaleText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("scale_hint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-intro">{t("intro")}</Label>
          <Textarea
            id="rc-intro"
            rows={6}
            value={introText}
            maxLength={3000}
            onChange={(e) => setIntroText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("intro_hint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("save")}
          </Button>
          <Button variant="outline" asChild>
            <a href={`/climate-report/${surveyId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              {t("view_report")}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
