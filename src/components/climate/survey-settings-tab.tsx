"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIMATE_SURVEY_TYPE_LABELS,
  SURVEY_FREQUENCY_LABELS,
} from "@/lib/constants/climate-survey";
import {
  updateSurveySettings,
  type SurveySettingsInput,
} from "@/lib/actions/climate-surveys";
import { formatRelativeTime } from "@/lib/utils/dates";

interface DistributionInfo {
  id: string;
  sentAt: Date | null;
  dueDate: Date;
  targetType: string;
  responseCount: number;
  completedCount: number;
}

interface SurveySettingsTabProps {
  surveyId: string;
  initialValues: {
    name: string;
    description: string | null;
    type: "CLIMATE" | "PULSE" | "ENPS";
    frequency: string;
    isAnonymous: boolean;
    questionsPerPage: number | null;
    logoUrl: string | null;
    accessStartDate: Date | null;
    accessEndDate: Date | null;
  };
  distributions: DistributionInfo[];
}

function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function SurveySettingsTab({
  surveyId,
  initialValues,
  distributions,
}: SurveySettingsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(
    initialValues.description ?? ""
  );
  const [type, setType] = useState(initialValues.type);
  const [frequency, setFrequency] = useState(initialValues.frequency);
  const [isAnonymous, setIsAnonymous] = useState(initialValues.isAnonymous);
  const [questionsPerPage, setQuestionsPerPage] = useState<string>(
    initialValues.questionsPerPage?.toString() ?? "0"
  );
  const [logoUrl, setLogoUrl] = useState(initialValues.logoUrl ?? "");
  const [restrictAccess, setRestrictAccess] = useState(
    !!(initialValues.accessStartDate || initialValues.accessEndDate)
  );
  const [accessStart, setAccessStart] = useState(
    toDatetimeLocal(initialValues.accessStartDate)
  );
  const [accessEnd, setAccessEnd] = useState(
    toDatetimeLocal(initialValues.accessEndDate)
  );

  const handleSave = () => {
    startTransition(async () => {
      const input: SurveySettingsInput = {
        name,
        description: description || undefined,
        type,
        frequency,
        isAnonymous,
        questionsPerPage:
          questionsPerPage === "0" || questionsPerPage === ""
            ? null
            : parseInt(questionsPerPage, 10),
        logoUrl: logoUrl || null,
        accessStartDate:
          restrictAccess && accessStart ? new Date(accessStart) : null,
        accessEndDate:
          restrictAccess && accessEnd ? new Date(accessEnd) : null,
      };

      try {
        const result = await updateSurveySettings(surveyId, input);
        if (result.success) {
          toast.success("Settings saved");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to save settings");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save settings"
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Survey Details */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Survey name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType(v as "CLIMATE" | "PULSE" | "ENPS")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIMATE_SURVEY_TYPE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SURVEY_FREQUENCY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Response Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Anonymous responses</Label>
              <p className="text-xs text-muted-foreground">
                Respondent identities will not be linked to their answers.
              </p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="qpp">Questions per page</Label>
              <p className="text-xs text-muted-foreground">
                Set to 0 to show all questions on a single page.
              </p>
            </div>
            <Input
              id="qpp"
              type="number"
              min={0}
              value={questionsPerPage}
              onChange={(e) => setQuestionsPerPage(e.target.value)}
              className="w-20 text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Access Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Access Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Restrict access period</Label>
              <p className="text-xs text-muted-foreground">
                Respondents can only complete the survey during a specified time
                window.
              </p>
            </div>
            <Switch
              checked={restrictAccess}
              onCheckedChange={(checked) => {
                setRestrictAccess(checked);
                if (!checked) {
                  setAccessStart("");
                  setAccessEnd("");
                }
              }}
            />
          </div>

          {restrictAccess && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="access-start">
                  Survey opens after this date
                </Label>
                <Input
                  id="access-start"
                  type="datetime-local"
                  value={accessStart}
                  onChange={(e) => setAccessStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="access-end">
                  Survey closes after this date
                </Label>
                <Input
                  id="access-end"
                  type="datetime-local"
                  value={accessEnd}
                  onChange={(e) => setAccessEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Add a logo that will appear in the survey header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Survey logo"
                className="h-14 w-14 rounded-lg border object-contain p-1"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distributions (read-only) */}
      {distributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distributions</CardTitle>
            <CardDescription>
              {distributions.length} distribution
              {distributions.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distributions.map((dist) => (
                <div
                  key={dist.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Sent{" "}
                      {dist.sentAt
                        ? formatRelativeTime(dist.sentAt)
                        : "Not sent"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatRelativeTime(dist.dueDate)} · Target:{" "}
                      {dist.targetType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {dist.completedCount}/{dist.responseCount} completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dist.responseCount > 0
                        ? Math.round(
                            (dist.completedCount / dist.responseCount) * 100
                          )
                        : 0}
                      % completion
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="lg">
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save settings
        </Button>
      </div>
    </div>
  );
}
