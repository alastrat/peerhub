"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Save, ImagePlus, Upload } from "lucide-react";
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
  updateSurveySettings,
  uploadSurveyLogo,
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
    type: "CLIMATE" | "PULSE" | "ENPS" | "LEADERSHIP" | "CULTURE" | "PERFORMANCE";
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
  const t = useTranslations("dashboard.climate.settings_tab");
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(
    initialValues.description ?? ""
  );
  // type + frequency are intentionally not editable from the settings form —
  // they're set at survey creation and reading them here would suggest they
  // can be changed. Existing values stay on the row untouched.
  const [isAnonymous, setIsAnonymous] = useState(initialValues.isAnonymous);
  const [questionsPerPage, setQuestionsPerPage] = useState<string>(
    initialValues.questionsPerPage?.toString() ?? "0"
  );
  const [logoUrl, setLogoUrl] = useState(initialValues.logoUrl ?? "");
  // "upload" = pick a file and hand it to Supabase Storage; "url" = paste a
  // public URL into the input. Default to URL so the existing data is what
  // the user sees first.
  const [logoSource, setLogoSource] = useState<"upload" | "url">("url");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [restrictAccess, setRestrictAccess] = useState(
    !!(initialValues.accessStartDate || initialValues.accessEndDate)
  );
  const [accessStart, setAccessStart] = useState(
    toDatetimeLocal(initialValues.accessStartDate)
  );
  const [accessEnd, setAccessEnd] = useState(
    toDatetimeLocal(initialValues.accessEndDate)
  );

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice re-fires onChange.
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadSurveyLogo(surveyId, formData);
      if (!result.success || !result.data) {
        toast.error(result.error || t("logo_upload_error"));
        return;
      }
      setLogoUrl(result.data.url);
      toast.success(t("logo_uploaded"));
    } catch {
      toast.error(t("logo_upload_error"));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const input: SurveySettingsInput = {
        name,
        description: description || undefined,
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
          toast.success(t("saved_toast"));
          router.refresh();
        } else {
          toast.error(result.error || t("save_failed"));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("save_failed"));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Survey Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t("survey_details_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("name_label")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("description_label")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

        </CardContent>
      </Card>

      {/* Response Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("response_settings_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("anonymous_label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("anonymous_hint")}
              </p>
            </div>
            <Switch
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="qpp">{t("questions_per_page_label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("questions_per_page_hint")}
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
          <CardTitle>{t("access_settings_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("restrict_label")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("restrict_hint")}
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
                <Label htmlFor="access-start">{t("access_start_label")}</Label>
                <Input
                  id="access-start"
                  type="datetime-local"
                  value={accessStart}
                  onChange={(e) => setAccessStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="access-end">{t("access_end_label")}</Label>
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
          <CardTitle>{t("branding_title")}</CardTitle>
          <CardDescription>{t("branding_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={t("logo_alt")}
                className="h-14 w-14 shrink-0 rounded-lg border object-contain p-1"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="logo-source">{t("logo_source_label")}</Label>
                <Select
                  value={logoSource}
                  onValueChange={(v) => setLogoSource(v as "upload" | "url")}
                >
                  <SelectTrigger id="logo-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upload">
                      {t("logo_source_upload")}
                    </SelectItem>
                    <SelectItem value="url">
                      {t("logo_source_url")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {logoSource === "upload" ? (
                <div className="space-y-1.5">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={handleLogoFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isUploadingLogo
                      ? t("logo_uploading")
                      : t("logo_pick_file")}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t("logo_upload_hint")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="logo-url">{t("logo_url_label")}</Label>
                  <Input
                    id="logo-url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distributions (read-only) */}
      {distributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("distributions_title")}</CardTitle>
            <CardDescription>
              {t(
                distributions.length === 1
                  ? "distributions_count_one"
                  : "distributions_count_other",
                { count: distributions.length },
              )}
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
                      {dist.sentAt
                        ? t("sent_relative", {
                            when: formatRelativeTime(dist.sentAt),
                          })
                        : t("not_sent")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("due_target", {
                        when: formatRelativeTime(dist.dueDate),
                        target: dist.targetType,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {t("completed_count", {
                        completed: dist.completedCount,
                        total: dist.responseCount,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("completion_percent", {
                        percent:
                          dist.responseCount > 0
                            ? Math.round(
                                (dist.completedCount / dist.responseCount) *
                                  100,
                              )
                            : 0,
                      })}
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
          {t("save_settings")}
        </Button>
      </div>
    </div>
  );
}
