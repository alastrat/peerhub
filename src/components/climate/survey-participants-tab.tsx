"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Search,
  Send,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { distributeSurvey } from "@/lib/actions/climate-distribution";
import { formatRelativeTime } from "@/lib/utils/dates";
import {
  ParticipantScopePicker,
  type ParticipantScopeValue,
} from "@/components/climate/participant-scope-picker";

// ---------------------------------------------------------------------------
// Types

export interface ParticipantRow {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeTitle: string | null;
  departmentName: string | null;
  hubName: string | null;
  isComplete: boolean;
  submittedAt: Date | null;
  updatedAt: Date | null;
  answeredCount: number;
  totalQuestions: number;
}

interface IdNamePair {
  id: string;
  name: string;
}

export interface InviteeRow {
  id: string;
  name: string;
  email: string;
  title: string | null;
  department: IdNamePair | null;
  hub: IdNamePair | null;
  teams: IdNamePair[];
}

interface SurveyParticipantsTabProps {
  surveyId: string;
  surveyStatus: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  responses: ParticipantRow[];
  employees: InviteeRow[];
  hubs: IdNamePair[];
  departments: IdNamePair[];
  teams: IdNamePair[];
  isAnonymous: boolean;
  featureHubs: boolean;
  // Pulled from the survey itself (set in the Configuración tab). Used as the
  // due date for every invitation fired from this tab so the deadline lives in
  // one place instead of being asked at each invite.
  accessEndDate: Date | null;
}

type SortDir = "asc" | "desc";
interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

export function SurveyParticipantsTab(props: SurveyParticipantsTabProps) {
  if (props.surveyStatus === "DRAFT") {
    return <InvitePicker {...props} />;
  }
  return <ResponderTable {...props} />;
}

// ---------------------------------------------------------------------------
// Header-sort cell — used by both modes.

function SortableHead<K extends string>({
  field,
  label,
  sort,
  onSort,
  className,
  align = "left",
}: {
  field: K;
  label: string;
  sort: SortState<K> | null;
  onSort: (next: SortState<K>) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort?.key === field;
  const dir = active ? sort!.dir : null;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() =>
          onSort({
            key: field,
            dir: active && dir === "asc" ? "desc" : "asc",
          })
        }
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
          active ? "text-foreground" : "text-muted-foreground",
          "hover:text-foreground",
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 transition-opacity",
            active ? "opacity-100" : "opacity-40",
          )}
        />
      </button>
    </TableHead>
  );
}

function compare(a: unknown, b: unknown, dir: SortDir) {
  // null/undefined always sort last regardless of direction
  const aMissing = a == null || a === "";
  const bMissing = b == null || b === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return dir === "asc" ? a - b : b - a;
  }
  if (a instanceof Date && b instanceof Date) {
    return dir === "asc" ? a.getTime() - b.getTime() : b.getTime() - a.getTime();
  }
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
}

// ---------------------------------------------------------------------------
// Mode A — responder table (non-DRAFT)

type ResponderSortKey =
  | "name"
  | "department"
  | "hub"
  | "progress"
  | "status"
  | "lastActivity";

function ResponderTable({
  responses,
  isAnonymous,
}: SurveyParticipantsTabProps) {
  const t = useTranslations("dashboard.climate.detail.participants_tab");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<ResponderSortKey> | null>(null);

  const completedCount = responses.filter((r) => r.isComplete).length;
  const pendingCount = responses.length - completedCount;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = responses;
    if (term && !isAnonymous) {
      rows = rows.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(term) ||
          r.employeeEmail.toLowerCase().includes(term),
      );
    }
    if (sort) {
      const get = (r: ParticipantRow): unknown => {
        switch (sort.key) {
          case "name":
            return isAnonymous ? null : r.employeeName;
          case "department":
            return r.departmentName;
          case "hub":
            return r.hubName;
          case "progress":
            return r.answeredCount;
          case "status":
            return r.isComplete ? 1 : 0;
          case "lastActivity":
            return r.submittedAt ?? r.updatedAt ?? null;
        }
      };
      rows = [...rows].sort((a, b) => compare(get(a), get(b), sort.dir));
    }
    return rows;
  }, [responses, search, sort, isAnonymous]);

  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 font-semibold">{t("empty_title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("empty_hint")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("summary", {
              total: responses.length,
              completed: completedCount,
              pending: pendingCount,
            })}
          </CardDescription>
        </div>
        {!isAnonymous && (
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search_placeholder")}
              className="ps-10"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                field="name"
                label={t("col_participant")}
                sort={sort}
                onSort={setSort}
              />
              <SortableHead
                field="department"
                label={t("col_department")}
                sort={sort}
                onSort={setSort}
              />
              <SortableHead
                field="hub"
                label={t("col_hub")}
                sort={sort}
                onSort={setSort}
              />
              <SortableHead
                field="progress"
                label={t("col_progress")}
                sort={sort}
                onSort={setSort}
              />
              <SortableHead
                field="status"
                label={t("col_status")}
                sort={sort}
                onSort={setSort}
              />
              <SortableHead
                field="lastActivity"
                label={t("col_last_activity")}
                sort={sort}
                onSort={setSort}
                align="right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {isAnonymous ? (
                    <span className="text-muted-foreground italic">
                      {t("anonymous")}
                    </span>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-medium">{r.employeeName}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.employeeEmail}
                      </span>
                      {r.employeeTitle && (
                        <span className="text-xs text-muted-foreground">
                          {r.employeeTitle}
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.departmentName ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.hubName ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {r.answeredCount}/{r.totalQuestions}
                </TableCell>
                <TableCell>
                  {r.isComplete ? (
                    <Badge variant="secondary">{t("status_completed")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("status_in_progress")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.submittedAt
                    ? formatRelativeTime(r.submittedAt)
                    : r.updatedAt
                      ? formatRelativeTime(r.updatedAt)
                      : "—"}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {t("no_matches")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mode B — invitee picker (DRAFT)
//
// Re-uses the same ParticipantScopePicker as the survey wizard so the create
// and the invite-from-detail flows have identical UI semantics (scope
// dropdown + scope-specific selector + CUSTOM employee list).

function InvitePicker({
  surveyId,
  employees,
  hubs,
  departments,
  teams,
  featureHubs,
  accessEndDate,
}: SurveyParticipantsTabProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.climate.detail.participants_tab");
  const [isPending, startTransition] = useTransition();

  const [picker, setPicker] = useState<ParticipantScopeValue>({
    scope: "CUSTOM",
    scopeIds: [],
    participantIds: [],
  });

  // Single source of truth for the deadline: the survey's accessEndDate (set
  // in the Configuración tab). If it's null we fall back to +14d so the
  // existing distribute action still has a valid date, and we surface a hint
  // pointing the admin to the right place to configure it.
  const dueDate =
    accessEndDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const dueDateConfigured = accessEndDate !== null;

  // Map the picker's value into distributeSurvey's payload shape. CUSTOM
  // routes through participantIds; the other scopes route through scopeIds.
  const handleInvite = () => {
    if (!canInvite) return;
    startTransition(async () => {
      const targetIds =
        picker.scope === "CUSTOM" ? picker.participantIds : picker.scopeIds;
      const result = await distributeSurvey({
        surveyId,
        targetType: picker.scope,
        targetIds: picker.scope === "ALL" ? undefined : targetIds,
        dueDate,
      });
      if (!result.success) {
        toast.error(result.error || t("invite_failed"));
        return;
      }
      toast.success(t("invite_sent"));
      setPicker({ scope: "CUSTOM", scopeIds: [], participantIds: [] });
      router.refresh();
    });
  };

  const canInvite =
    picker.scope === "ALL"
      ? employees.length > 0
      : picker.scope === "CUSTOM"
        ? picker.participantIds.length > 0
        : picker.scopeIds.length > 0;
  const recipientCount =
    picker.scope === "ALL"
      ? employees.length
      : picker.scope === "CUSTOM"
        ? picker.participantIds.length
        : picker.scopeIds.length;

  return (
    <div className="space-y-4">
      <ParticipantScopePicker
        value={picker}
        onChange={setPicker}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          title: e.title,
        }))}
        hubs={hubs}
        departments={departments}
        teams={teams}
        featureHubs={featureHubs}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          {dueDateConfigured
            ? t("due_date_from_settings", { date: dueDate.toLocaleDateString() })
            : t("due_date_not_set_hint")}
        </p>
        <Button onClick={handleInvite} disabled={!canInvite || isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {t("invite_selected", { count: recipientCount })}
        </Button>
      </div>
    </div>
  );
}

