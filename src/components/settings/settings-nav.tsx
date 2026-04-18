"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Building2,
  Globe,
  Puzzle,
  Users,
  Layers,
  Shield,
  Activity,
  Target,
  MapPin,
  UsersRound,
} from "lucide-react";

interface NavItemDef {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const GENERAL_ITEMS: NavItemDef[] = [
  { href: "/settings/profile", labelKey: "profile", icon: User },
];

const COMPANY_ITEMS: NavItemDef[] = [
  { href: "/settings/company", labelKey: "general", icon: Building2 },
  { href: "/settings/company/members", labelKey: "members", icon: Users },
  { href: "/settings/company/roles", labelKey: "roles", icon: Shield },
  { href: "/settings/company/departments", labelKey: "departments", icon: Layers },
  { href: "/settings/company/teams", labelKey: "teams", icon: UsersRound },
  { href: "/settings/company/competencies", labelKey: "competencies", icon: Target },
];

const HUB_ITEM: NavItemDef = { href: "/settings/company/hubs", labelKey: "hubs", icon: MapPin };

const PLATFORM_ITEMS: NavItemDef[] = [
  { href: "/settings/company/domain", labelKey: "company_domain", icon: Globe },
  { href: "/settings/company/features", labelKey: "features", icon: Puzzle },
  { href: "/settings/platform/domains", labelKey: "admin_domains", icon: Globe },
  { href: "/settings/platform/health", labelKey: "platform_health", icon: Activity },
];

export function SettingsNav({
  isCompanyAdmin,
  isSuperAdmin,
  featureHubs = false,
}: {
  isCompanyAdmin: boolean;
  isSuperAdmin: boolean;
  featureHubs?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.settings");

  const sections: { titleKey?: string; items: NavItemDef[] }[] = [{ items: GENERAL_ITEMS }];

  if (isCompanyAdmin) {
    const companyItems = featureHubs
      ? [...COMPANY_ITEMS.slice(0, 4), HUB_ITEM, ...COMPANY_ITEMS.slice(4)]
      : COMPANY_ITEMS;
    sections.push({ titleKey: "company_section", items: companyItems });
  }

  if (isSuperAdmin) {
    sections.push({ titleKey: "platform_section", items: PLATFORM_ITEMS });
  }

  return (
    <nav className="w-48 shrink-0 space-y-6 sticky top-6 self-start">
      {sections.map((section, si) => (
        <div key={si}>
          {section.titleKey && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t(section.titleKey)}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
