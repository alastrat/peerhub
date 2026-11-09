"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Download, Link2, Loader2, MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createSurveyLink, createSurveyLinksWithoutEmail } from "@/lib/actions/survey-links";
import { whatsAppUrl } from "@/lib/people/phone";
import { toCsv } from "@/lib/utils/csv";
import { formatDate } from "@/lib/utils/dates";

export interface LinkPerson {
  employeeId: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationalId: string | null;
}

interface SurveyLinksCardProps {
  surveyId: string;
  surveyName: string;
  companyName: string;
  people: LinkPerson[];
}

/**
 * Personal survey links (a proposal to validate with Kultiva): for people
 * without a corporate email, who get no invitation, the admin copies their
 * single-use link or sends it by WhatsApp. Shows who was invited, never
 * their progress, so it works for anonymous surveys too.
 */
export function SurveyLinksCard({ surveyId, surveyName, companyName, people }: SurveyLinksCardProps) {
  const t = useTranslations("dashboard.climate.detail.participants_tab.links");
  const locale = useLocale();
  const withoutEmail = people.filter((p) => !p.email);
  const [onlyWithoutEmail, setOnlyWithoutEmail] = useState(withoutEmail.length > 0);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // The last link made per person, shown in the row when copying or opening WhatsApp fails
  const [shown, setShown] = useState<Record<string, string>>({});
  const [downloading, startDownload] = useTransition();

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (onlyWithoutEmail ? withoutEmail : people).filter(
      (p) => !term || p.name.toLowerCase().includes(term) || (p.nationalId ?? "").includes(term),
    );
  }, [people, withoutEmail, onlyWithoutEmail, search]);

  async function newLink(person: LinkPerson) {
    const result = await createSurveyLink(surveyId, person.employeeId);
    if (!result.success || !result.data) {
      toast.error(result.error ?? t("copy_failed"));
      return null;
    }
    return result.data;
  }

  async function copyLink(person: LinkPerson) {
    setBusy(person.employeeId);
    try {
      const link = await newLink(person);
      if (!link) return;
      try {
        await navigator.clipboard.writeText(link.url);
        toast.success(t("copied", { date: formatDate(link.expiresAt, undefined, locale) }));
      } catch {
        setShown((s) => ({ ...s, [person.employeeId]: link.url }));
        toast.warning(t("copy_failed"));
      }
    } finally {
      setBusy(null);
    }
  }

  async function sendWhatsApp(person: LinkPerson) {
    // Opened right away, while the click still counts, so popup blockers allow it
    const win = window.open("", "_blank");
    setBusy(person.employeeId);
    try {
      const link = await newLink(person);
      if (!link) {
        win?.close();
        return;
      }
      const message = t("whatsapp_message", {
        name: person.name.trim().split(/\s+/)[0] ?? "",
        company: companyName,
        survey: surveyName,
        link: link.url,
      });
      const url = person.phone ? whatsAppUrl(person.phone, message) : null;
      if (win && url) {
        win.opener = null;
        win.location.href = url;
      } else {
        win?.close();
        setShown((s) => ({ ...s, [person.employeeId]: link.url }));
        toast.warning(t("whatsapp_blocked"));
      }
    } finally {
      setBusy(null);
    }
  }

  function downloadCsv() {
    startDownload(async () => {
      const result = await createSurveyLinksWithoutEmail(surveyId);
      if (!result.success || !result.data) {
        toast.error(result.error ?? t("copy_failed"));
        return;
      }
      const links = result.data;
      if (links.length > 0) {
        const csv = toCsv([
          [t("csv_name"), t("csv_national_id"), t("csv_phone"), t("csv_link"), t("csv_expires")],
          ...links.map((l) => [l.name, l.nationalId, l.phone, l.url, formatDate(l.expiresAt, undefined, locale)]),
        ]);
        const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = href;
        const slug = surveyName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase();
        a.download = t("csv_filename", { survey: slug || "encuesta" });
        a.click();
        URL.revokeObjectURL(href);
      }
      toast.success(t("csv_downloaded", { count: links.length }));
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {t("title")}
            </CardTitle>
            <CardDescription className="max-w-2xl">{t("description")}</CardDescription>
          </div>
          {withoutEmail.length > 0 && (
            <Button variant="outline" onClick={downloadCsv} disabled={downloading} title={t("download_hint")}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {t("download_csv")}
            </Button>
          )}
        </div>
        {withoutEmail.length > 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("without_email_hint", { count: withoutEmail.length })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" role="group">
            {[
              { value: true, label: t("filter_without_email", { count: withoutEmail.length }) },
              { value: false, label: t("filter_all", { count: people.length }) },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                aria-pressed={onlyWithoutEmail === option.value}
                onClick={() => setOnlyWithoutEmail(option.value)}
                className={cn(
                  "rounded px-3 py-1 text-sm",
                  onlyWithoutEmail === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search_placeholder")} className="ps-10" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[480px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col_person")}</TableHead>
                <TableHead>{t("col_phone")}</TableHead>
                <TableHead className="text-right">{t("col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.employeeId}>
                  <TableCell>
                    <span className="block font-medium">{p.name}</span>
                    {p.email ? (
                      <span className="block text-xs text-muted-foreground">{p.email}</span>
                    ) : (
                      <Badge variant="outline" className="mt-0.5 border-sky-200 bg-sky-50 text-xs text-sky-800">
                        {t("no_email")}
                      </Badge>
                    )}
                    {shown[p.employeeId] && (
                      <span className="mt-1 block text-xs">
                        {t("generated_link")}{" "}
                        <code className="select-all break-all rounded bg-muted px-1">{shown[p.employeeId]}</code>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{p.phone ?? t("no_phone")}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => copyLink(p)}>
                        {busy === p.employeeId ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                        {t("copy")}
                      </Button>
                      {p.phone && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => sendWhatsApp(p)}>
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          {t("whatsapp")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
