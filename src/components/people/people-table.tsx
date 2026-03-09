"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  EMPLOYEE: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export type PersonRow = {
  id: string;
  role: CompanyRole;
  title: string | null;
  user: { name: string | null; image: string | null };
  department: { name: string } | null;
  manager: { user: { name: string | null } } | null;
};

type SortField = "name" | "role" | "title" | "department" | "manager";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

export function PeopleTable({ data }: { data: PersonRow[] }) {
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
          p.user.name?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.department?.name.toLowerCase().includes(q) ||
          p.manager?.user.name?.toLowerCase().includes(q)
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
          return p.user.name || "";
        case "role":
          return p.role;
        case "title":
          return p.title || "";
        case "department":
          return p.department?.name || "";
        case "manager":
          return p.manager?.user.name || "";
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
            placeholder="Search people..."
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
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={handleFilterChange(setDeptFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
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
              <TableHead><SortButton field="name">Name</SortButton></TableHead>
              <TableHead><SortButton field="role">Role</SortButton></TableHead>
              <TableHead><SortButton field="title">Title</SortButton></TableHead>
              <TableHead><SortButton field="department">Department</SortButton></TableHead>
              <TableHead><SortButton field="manager">Manager</SortButton></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((person) => (
                <TableRow key={person.id} className="!bg-white hover:!bg-gray-50">
                  <TableCell>
                    <Link href={`/people/${person.id}`} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={person.user.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {person.user.name ? getInitials(person.user.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{person.user.name || "Unnamed"}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs border ${ROLE_BADGE_STYLES[person.role]}`}>
                      {ROLE_LABELS[person.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.title || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.department?.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {person.manager?.user.name || "—"}
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
          Showing {sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {safePage + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
