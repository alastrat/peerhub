import type { CompanyRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AccessStatus } from "@/lib/people/access";

// Shared by the people table (client) and a person's page (server), so labels
// come in already translated

const ROLE_STYLES: Record<CompanyRole, string> = {
  ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  MEMBER: "bg-slate-100 text-slate-700 border-slate-200",
};

const ACCESS_STYLES: Record<AccessStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INVITED: "bg-amber-50 text-amber-800 border-amber-200",
  NONE: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({ role, label }: { role: CompanyRole; label: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs border whitespace-nowrap", ROLE_STYLES[role])}>
      {label}
    </Badge>
  );
}

export function AccessBadge({ access, label, hint }: { access: AccessStatus; label: string; hint?: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs border whitespace-nowrap", ACCESS_STYLES[access])} title={hint}>
      {label}
    </Badge>
  );
}
