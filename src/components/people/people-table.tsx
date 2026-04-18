"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { CompanyRole } from "@prisma/client";

const ROLE_BADGE_STYLES: Record<CompanyRole, string> = {
  ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  MEMBER: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export type PersonRow = {
  id: string;
  name: string;
  title: string | null;
  role: CompanyRole | null;
  department: { name: string } | null;
  manager: { name: string } | null;
  hub?: { name: string } | null;
};

type SortField = "name" | "role" | "title" | "department" | "manager" | "hub";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

export function PeopleTable({ data, featureHubs = false }: { data: PersonRow[]; featureHubs?: boolean }) {
  const t = useTranslations("dashboard.people");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);

  const departments = useMemo(() => {
    const set = new Set<string>();
    data.forEach((p) => {
      if (p.department) set.add(p.department.name);
    });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.department?.name.toLowerCase().includes(q) ||
          p.manager?.name?.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((p) => p.role === roleFilter);
    }

    if (deptFilter !== "all") {
      result = result.filter((p) => p.department?.name === deptFilter);
    }

    return result;
  }, [data, search, roleFilter, deptFilter]);

  const sorted = useMemo(() => {
    const getValue = (p: PersonRow): string => {
      switch (sortField) {
        case "name":
          return p.name || "";
        case "role":
          return p.role || "";
        case "title":
          return p.title || "";
        case "department":
          return p.department?.name || "";
        case "manager":
          return p.manager?.name || "";
        case "hub":
          return p.hub?.name || "";
      }
    };

    return [...filtered].sort((a, b) => {
      const aVal = getValue(a).toLowerCase();
      const bVal = getValue(b).toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === field ? "opacity-100" : "opacity-40"}`} />
    </button>
  );

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
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("allRoles")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRoles")}</SelectItem>
            <SelectItem value="ADMIN">{t("admin")}</SelectItem>
            <SelectItem value="MANAGER">{t("manager")}</SelectItem>
            <SelectItem value="MEMBER">{t("member")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={handleFilterChange(setDeptFilter)}>
          <SelectTrigger className="w-[180px]">
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

      {/* Table */}
      <div className="rounded-lg border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead><SortButton field="name">{t("name")}</SortButton></TableHead>
              <TableHead><SortButton field="role">{t("role")}</SortButton></TableHead>
              <TableHead><SortButton field="title">{t("title")}</SortButton></TableHead>
              <TableHead><SortButton field="department">{t("department")}</SortButton></TableHead>
              {featureHubs && <TableHead><SortButton field="hub">{t("hub")}</SortButton></TableHead>}
              <TableHead><SortButton field="manager">{t("managerColumn")}</SortButton></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={featureHubs ? 6 : 5} className="h-24 text-center text-muted-foreground">
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
                      <span className="font-medium">{person.name || t("unnamed")}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {person.role ? (
                      <Badge variant="outline" className={`text-xs border ${ROLE_BADGE_STYLES[person.role]}`}>
                        {ROLE_LABELS[person.role]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.title || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.department?.name || "—"}
                  </TableCell>
                  {featureHubs && (
                    <TableCell className="text-muted-foreground">
                      {person.hub?.name || "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {person.manager?.name || "—"}
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
