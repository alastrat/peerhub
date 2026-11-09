"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/utils/formatting";
import { formatDay } from "@/lib/constants/business-time";
import { JOB_LEVELS } from "@/lib/constants/job-levels";
import { ACCESS_STATUSES } from "@/lib/people/access";
import type { PersonRow } from "@/lib/queries/people";
import type { CompanyRole } from "@prisma/client";
import { AccessBadge, RoleBadge } from "./person-badges";

const ROLE_KEYS = { ADMIN: "admin", MANAGER: "manager", MEMBER: "member" } as const;
const ROLES = ["ADMIN", "MANAGER", "MEMBER"] as const satisfies readonly CompanyRole[];

type SortField =
  | "name"
  | "role"
  | "access"
  | "nationalId"
  | "phone"
  | "title"
  | "department"
  | "hub"
  | "manager"
  | "jobLevel"
  | "startDate"
  | "gender"
  | "birthDate";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

/**
 * Personas: everyone on the roster with every field the employee import
 * loads, their role (Miembro unless their account says otherwise) and their
 * platform access.
 */
export function PeopleTable({ data, showHubs = false }: { data: PersonRow[]; showHubs?: boolean }) {
  const t = useTranslations("dashboard.people");
  const tFields = useTranslations("employee_fields");
  const tDemographics = useTranslations("demographics");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [accessFilter, setAccessFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const departments = useMemo(() => {
    const set = new Set<string>();
    data.forEach((p) => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        [p.name, p.email, p.phone, p.nationalId, p.title, p.department, p.hub, p.manager].some((v) => v?.toLowerCase().includes(q)),
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((p) => p.role === roleFilter);
    }

    if (accessFilter !== "all") {
      result = result.filter((p) => p.access === accessFilter);
    }

    if (deptFilter !== "all") {
      result = result.filter((p) => p.department === deptFilter);
    }

    return result;
  }, [data, search, roleFilter, accessFilter, deptFilter]);

  const sorted = useMemo(() => {
    // Ranked fields sort by rank; empty values always go last
    const getValue = (p: PersonRow): string | number | null => {
      switch (sortField) {
        case "role":
          return ROLES.indexOf(p.role);
        case "access":
          return ACCESS_STATUSES.indexOf(p.access);
        case "jobLevel":
          return p.jobLevel ? JOB_LEVELS.indexOf(p.jobLevel) : null;
        case "startDate":
        case "birthDate":
          return p[sortField] ? new Date(p[sortField]!).getTime() : null;
        case "gender":
          return p.gender ? tDemographics(`gender.${p.gender}`).toLowerCase() : null;
        default:
          return p[sortField]?.toLowerCase() || null;
      }
    };

    return [...filtered].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (aVal === bVal) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      return sortDir === "asc" ? 1 : -1;
    });
  }, [filtered, sortField, sortDir, tDemographics]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const columnCount = showHubs ? 13 : 12;

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(0);
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(0);
    };
  }

  // A plain function, not a component: a component defined here would remount on every render
  const sortHeader = (field: SortField, label: string) => (
    <TableHead>
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 whitespace-nowrap hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === field ? "opacity-100" : "opacity-40"}`} />
      </button>
    </TableHead>
  );

  const empty = <span className="text-muted-foreground">—</span>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="ps-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={handleFilterChange(setRoleFilter)}>
          <SelectTrigger className="w-[160px]" aria-label={t("role")}>
            <SelectValue placeholder={t("allRoles")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRoles")}</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(ROLE_KEYS[role])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accessFilter} onValueChange={handleFilterChange(setAccessFilter)}>
          <SelectTrigger className="w-[160px]" aria-label={t("access")}>
            <SelectValue placeholder={t("allAccess")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allAccess")}</SelectItem>
            {ACCESS_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`access_status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={handleFilterChange(setDeptFilter)}>
          <SelectTrigger className="w-[180px]" aria-label={t("department")}>
            <SelectValue placeholder={t("allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allDepartments")}</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table: every imported field, so it scrolls sideways on narrow screens */}
      <div className="rounded-lg border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {sortHeader("name", t("name"))}
              {sortHeader("role", t("role"))}
              {sortHeader("access", t("access"))}
              {sortHeader("nationalId", tFields("national_id"))}
              {sortHeader("phone", tFields("phone"))}
              {sortHeader("title", t("title"))}
              {showHubs && sortHeader("hub", t("hub"))}
              {sortHeader("department", t("department"))}
              {sortHeader("manager", t("managerColumn"))}
              {sortHeader("startDate", tDemographics("fields.start_date"))}
              {sortHeader("gender", tDemographics("fields.gender"))}
              {sortHeader("birthDate", tDemographics("fields.birth_date"))}
              {sortHeader("jobLevel", tFields("job_level"))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((person) => (
                <TableRow key={person.id} className="!bg-white hover:!bg-gray-50">
                  <TableCell>
                    <Link href={`/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {person.name ? getInitials(person.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block font-medium">{person.name || t("unnamed")}</span>
                        <span className="block text-xs text-muted-foreground">{person.email}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={person.role} label={t(ROLE_KEYS[person.role])} />
                  </TableCell>
                  <TableCell>
                    <AccessBadge
                      access={person.access}
                      label={t(`access_status.${person.access}`)}
                      hint={t(`access_hint.${person.access}`)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                    {person.nationalId || empty}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">{person.phone || empty}</TableCell>
                  <TableCell className="text-muted-foreground">{person.title || empty}</TableCell>
                  {showHubs && <TableCell className="text-muted-foreground">{person.hub || empty}</TableCell>}
                  <TableCell className="text-muted-foreground">{person.department || empty}</TableCell>
                  <TableCell className="text-muted-foreground">{person.manager || empty}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {person.startDate ? formatDay(person.startDate, locale) : empty}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {person.gender ? tDemographics(`gender.${person.gender}`) : empty}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {person.birthDate ? formatDay(person.birthDate, locale) : empty}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {person.jobLevel ? tFields(`job_level_values.${person.jobLevel}`) : empty}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("showingRange", { start: sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1, end: Math.min((safePage + 1) * PAGE_SIZE, sorted.length), total: sorted.length })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { current: safePage + 1, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
