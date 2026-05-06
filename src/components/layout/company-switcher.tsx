"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, ChevronsUpDown, Check, Shield, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  getAvailableCompanies,
  switchCompany,
  type CompanySwitchOption,
} from "@/lib/actions/company";

export function CompanySwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard.company_switcher");
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

  const handleCreateAccount = () => {
    setOpen(false);
    // Deep-link to the platform companies page with the dialog opened. Same
    // dialog, same state — sourced from the URL search param so the table
    // page picks it up via useSearchParams.
    router.push("/settings/platform/companies?createCompany=1");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-9 gap-2 px-3 text-sm font-medium"
          disabled={isPending}
        >
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[140px] truncate">
            {isPending
              ? t("switching")
              : currentCompanyName || t("select_company")}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={t("search_placeholder")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            <CommandGroup
              heading={
                <span className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <Shield className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>
                    {isSuperAdmin ? t("all_companies") : t("your_companies")}
                  </span>
                </span>
              }
            >
              {companies.map((company) => (
                <CommandItem
                  key={company.companyId}
                  value={company.companyName}
                  onSelect={() => handleSwitch(company.companyId)}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{company.companyName}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {company.role}
                    </Badge>
                    <Check
                      className={cn(
                        "h-4 w-4 text-primary",
                        company.companyId === currentCompanyId
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* SUPER_ADMIN-only entry point to bootstrap a brand-new tenant.
                Hard-coded value string so it never collides with a real
                company name in the cmdk filter. */}
            {isSuperAdmin && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__create_account__"
                    onSelect={handleCreateAccount}
                    className="gap-2 text-primary"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>{t("create_account")}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
