"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export type ParticipantScope = "ALL" | "HUB" | "DEPARTMENT" | "TEAM" | "CUSTOM";

export interface NamedOption {
  id: string;
  name: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  title: string | null;
  /** Optional. Surfaced as a column + filter on the CUSTOM scope. */
  department?: NamedOption | null;
  /** Optional. Surfaced as a column + filter on the CUSTOM scope. */
  hub?: NamedOption | null;
  /** Optional. Used by the team filter on the CUSTOM scope. */
  teams?: NamedOption[];
}

export interface ParticipantScopeValue {
  scope: ParticipantScope;
  /** IDs for HUB / DEPARTMENT / TEAM scopes — empty for ALL and CUSTOM. */
  scopeIds: string[];
  /** Individual employee IDs for the CUSTOM scope — empty for the others. */
  participantIds: string[];
}

interface Props {
  value: ParticipantScopeValue;
  onChange: (next: ParticipantScopeValue) => void;
  employees: EmployeeOption[];
  hubs: NamedOption[];
  departments: NamedOption[];
  teams: NamedOption[];
  featureHubs?: boolean;
  /** Optional wrapper: when true, the picker is wrapped in a Card with a
   *  localized title + description. The wizard uses this; the participants
   *  tab embeds inside its own surface. Default true. */
  withCard?: boolean;
}

const ALL = "__all__";
type SortKey = "name" | "email" | "department" | "hub" | "title";
type SortDir = "asc" | "desc";
interface SortState {
  key: SortKey;
  dir: SortDir;
}

export function ParticipantScopePicker({
  value,
  onChange,
  employees,
  hubs,
  departments,
  teams,
  featureHubs = false,
  withCard = true,
}: Props) {
  const t = useTranslations("dashboard.climate.wizard.participants_step");

  const toggleScopeId = (id: string) => {
    const has = value.scopeIds.includes(id);
    onChange({
      ...value,
      scopeIds: has
        ? value.scopeIds.filter((x) => x !== id)
        : [...value.scopeIds, id],
    });
  };

  const body = (
    <>
      <div className="space-y-2">
        <Label>{t("scope_label")}</Label>
        <Select
          value={value.scope}
          onValueChange={(v) =>
            onChange({
              scope: v as ParticipantScope,
              scopeIds: [],
              participantIds: [],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("scope_all")}</SelectItem>
            {featureHubs && (
              <SelectItem value="HUB">{t("scope_hub")}</SelectItem>
            )}
            <SelectItem value="DEPARTMENT">{t("scope_department")}</SelectItem>
            <SelectItem value="TEAM">{t("scope_team")}</SelectItem>
            <SelectItem value="CUSTOM">{t("scope_custom")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {value.scope === "ALL" && t("scope_all_hint")}
          {value.scope === "HUB" && t("scope_hub_hint")}
          {value.scope === "DEPARTMENT" && t("scope_department_hint")}
          {value.scope === "TEAM" && t("scope_team_hint")}
          {value.scope === "CUSTOM" && t("scope_custom_hint")}
        </p>
      </div>

      {value.scope === "HUB" && (
        <ScopeChecklist
          items={hubs}
          selectedIds={value.scopeIds}
          onToggle={toggleScopeId}
          emptyLabel={t("no_hubs")}
          manageHref="/settings/company/hubs"
          manageLabel={t("manage_hubs")}
        />
      )}
      {value.scope === "DEPARTMENT" && (
        <ScopeChecklist
          items={departments}
          selectedIds={value.scopeIds}
          onToggle={toggleScopeId}
          emptyLabel={t("no_departments")}
          manageHref="/settings/company/departments"
          manageLabel={t("manage_departments")}
        />
      )}
      {value.scope === "TEAM" && (
        <ScopeChecklist
          items={teams}
          selectedIds={value.scopeIds}
          onToggle={toggleScopeId}
          emptyLabel={t("no_teams")}
          manageHref="/settings/company/teams"
          manageLabel={t("manage_teams")}
        />
      )}

      {value.scope === "CUSTOM" && (
        <CustomEmployeePicker
          value={value.participantIds}
          onChange={(ids) =>
            onChange({ ...value, participantIds: ids })
          }
          employees={employees}
          departments={departments}
          hubs={hubs}
          teams={teams}
          featureHubs={featureHubs}
        />
      )}
    </>
  );

  if (!withCard) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}

function ScopeChecklist({
  items,
  selectedIds,
  onToggle,
  emptyLabel,
  manageHref,
  manageLabel,
}: {
  items: NamedOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
  /** Settings route to create new items in this scope (departments,
   *  teams, hubs). When provided alongside an empty result set, the
   *  empty-state card shows a CTA link so the admin can leave the
   *  wizard, create what they need, and come back. */
  manageHref?: string;
  manageLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        <span>{emptyLabel}</span>
        {manageHref && manageLabel && (
          <Link href={manageHref} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {manageLabel}
            </Button>
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="max-h-64 space-y-2 overflow-auto rounded-lg border p-3">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onToggle(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(item.id);
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors",
              isSelected ? "border border-primary/30 bg-primary/10" : "hover:bg-muted",
            )}
          >
            <Checkbox checked={isSelected} />
            <span className="text-sm">{item.name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOM scope — search + filters + sortable table. Mirrors the table the
// detail-page Participantes tab used to surface, so the create + invite UIs
// keep parity.

function CustomEmployeePicker({
  value,
  onChange,
  employees,
  departments,
  hubs,
  teams,
  featureHubs,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  employees: EmployeeOption[];
  departments: NamedOption[];
  hubs: NamedOption[];
  teams: NamedOption[];
  featureHubs: boolean;
}) {
  const t = useTranslations("dashboard.climate.wizard.participants_step");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>(ALL);
  const [hubId, setHubId] = useState<string>(ALL);
  const [teamId, setTeamId] = useState<string>(ALL);
  const [sort, setSort] = useState<SortState | null>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Only surface hub / team filters when those columns have any data to
  // distinguish on — otherwise they're noise.
  const anyHub = employees.some((e) => e.hub);
  const anyTeam = employees.some((e) => e.teams && e.teams.length > 0);
  const showHubFilter = featureHubs && anyHub && hubs.length > 0;
  const showTeamFilter = anyTeam && teams.length > 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = employees;
    if (term) {
      rows = rows.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term),
      );
    }
    if (departmentId !== ALL) {
      rows = rows.filter((e) => e.department?.id === departmentId);
    }
    if (hubId !== ALL) {
      rows = rows.filter((e) => e.hub?.id === hubId);
    }
    if (teamId !== ALL) {
      rows = rows.filter((e) => e.teams?.some((tm) => tm.id === teamId));
    }
    if (sort) {
      const get = (e: EmployeeOption): unknown => {
        switch (sort.key) {
          case "name":
            return e.name;
          case "email":
            return e.email;
          case "department":
            return e.department?.name ?? null;
          case "hub":
            return e.hub?.name ?? null;
          case "title":
            return e.title;
        }
      };
      rows = [...rows].sort((a, b) => compare(get(a), get(b), sort.dir));
    }
    return rows;
  }, [employees, search, departmentId, hubId, teamId, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Whenever a filter / search trims the result set, snap the cursor back
  // into a valid page instead of leaving the user on a now-empty page.
  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  const pageRows = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );

  // "Visible" for the indeterminate select-all is the rows actually on
  // screen — i.e., the current page, not the entire filtered result.
  const visibleIds = useMemo(() => pageRows.map((e) => e.id), [pageRows]);
  const selected = useMemo(() => new Set(value), [value]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.has(id));

  const toggleId = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };
  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      for (const id of visibleIds) next.delete(id);
    } else {
      for (const id of visibleIds) next.add(id);
    }
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="ps-10"
          />
        </div>
        {departments.length > 0 && (
          <FilterSelect
            ariaLabel={t("col_department")}
            value={departmentId}
            onChange={setDepartmentId}
            allLabel={t("filter_all_departments")}
            options={departments}
          />
        )}
        {showHubFilter && (
          <FilterSelect
            ariaLabel={t("col_hub")}
            value={hubId}
            onChange={setHubId}
            allLabel={t("filter_all_hubs")}
            options={hubs}
          />
        )}
        {showTeamFilter && (
          <FilterSelect
            ariaLabel={t("col_team")}
            value={teamId}
            onChange={setTeamId}
            allLabel={t("filter_all_teams")}
            options={teams}
          />
        )}
      </div>

      <div className="flex justify-end">
        <Badge variant="secondary">
          {t("selected_count", {
            selected: selected.size,
            total: employees.length,
          })}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={toggleAllVisible}
                  aria-label={t("select_all_aria")}
                  disabled={visibleIds.length === 0}
                />
              </TableHead>
              <SortableHead field="name" label={t("col_name")} sort={sort} onSort={setSort} />
              <SortableHead field="email" label={t("col_email")} sort={sort} onSort={setSort} />
              {departments.length > 0 && (
                <SortableHead
                  field="department"
                  label={t("col_department")}
                  sort={sort}
                  onSort={setSort}
                />
              )}
              {showHubFilter && (
                <SortableHead field="hub" label={t("col_hub")} sort={sort} onSort={setSort} />
              )}
              <SortableHead field="title" label={t("col_title")} sort={sort} onSort={setSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((e) => {
              const isSelected = selected.has(e.id);
              return (
                <TableRow key={e.id} data-state={isSelected ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleId(e.id)}
                      aria-label={t("select_row_aria", { name: e.name })}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{e.name || e.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.email}</TableCell>
                  {departments.length > 0 && (
                    <TableCell className="text-sm text-muted-foreground">
                      {e.department?.name ?? "—"}
                    </TableCell>
                  )}
                  {showHubFilter && (
                    <TableCell className="text-sm text-muted-foreground">
                      {e.hub?.name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {e.title ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3 + (departments.length > 0 ? 1 : 0) + (showHubFilter ? 1 : 0)}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {employees.length === 0 ? t("no_employees") : t("no_matches")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t("pagination_page_of", {
                current: page + 1,
                total: totalPages,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label={t("pagination_previous")}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("pagination_previous")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                aria-label={t("pagination_next")}
              >
                {t("pagination_next")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  ariaLabel,
  value,
  onChange,
  allLabel,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: NamedOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[180px]" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortableHead({
  field,
  label,
  sort,
  onSort,
}: {
  field: SortKey;
  label: string;
  sort: SortState | null;
  onSort: (next: SortState) => void;
}) {
  const active = sort?.key === field;
  const dir = active ? sort!.dir : null;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() =>
          onSort({ key: field, dir: active && dir === "asc" ? "desc" : "asc" })
        }
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide",
          active ? "text-foreground" : "text-muted-foreground",
          "hover:text-foreground",
        )}
      >
        <span>{label}</span>
        <Icon className={cn("h-3.5 w-3.5 transition-opacity", active ? "opacity-100" : "opacity-40")} />
      </button>
    </TableHead>
  );
}

function compare(a: unknown, b: unknown, dir: SortDir) {
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
