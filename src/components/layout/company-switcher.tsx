"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown, Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  getAvailableCompanies,
  switchCompany,
  type CompanySwitchOption,
} from "@/lib/actions/company";

export function CompanySwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [companies, setCompanies] = useState<CompanySwitchOption[]>([]);
  const [open, setOpen] = useState(false);

  const currentCompanyId = session?.companyUser?.companyId;
  const currentCompanyName = session?.companyUser?.companyName;
  const isSuperAdmin = session?.user?.globalRole === "SUPER_ADMIN";

  useEffect(() => {
    getAvailableCompanies().then(setCompanies);
  }, [currentCompanyId]);

  // Don't render if user has only 1 company and is not super admin
  if (!isSuperAdmin && companies.length <= 1) return null;

  const handleSwitch = (companyId: string) => {
    if (companyId === currentCompanyId) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await switchCompany(companyId);
      if (result.success) {
        await update({ companyId });
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-3 text-sm font-medium"
          disabled={isPending}
        >
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[140px] truncate">
            {isPending ? "Switching..." : currentCompanyName || "Select company"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="flex items-center gap-2">
          {isSuperAdmin && <Shield className="h-3.5 w-3.5 text-primary" />}
          <span>{isSuperAdmin ? "All Companies" : "Your Companies"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.companyId}
            onClick={() => handleSwitch(company.companyId)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{company.companyName}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {company.role}
              </Badge>
              {company.companyId === currentCompanyId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
