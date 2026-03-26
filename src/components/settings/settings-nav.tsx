"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const GENERAL_ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: User },
];

const COMPANY_ITEMS: NavItem[] = [
  { href: "/settings/company", label: "General", icon: Building2 },
  { href: "/settings/company/members", label: "Members", icon: Users },
  { href: "/settings/company/roles", label: "Roles", icon: Shield },
  { href: "/settings/company/departments", label: "Departments", icon: Layers },
  { href: "/settings/company/teams", label: "Teams", icon: UsersRound },
  { href: "/settings/company/competencies", label: "Competencies", icon: Target },
];

const HUB_ITEM: NavItem = { href: "/settings/company/hubs", label: "Hubs", icon: MapPin };

const PLATFORM_ITEMS: NavItem[] = [
  { href: "/settings/company/domain", label: "Company Domain", icon: Globe },
  { href: "/settings/company/features", label: "Features", icon: Puzzle },
  { href: "/settings/platform/domains", label: "Admin Domains", icon: Globe },
  { href: "/settings/platform/health", label: "Platform Health", icon: Activity },
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

  const sections: NavSection[] = [{ items: GENERAL_ITEMS }];

  if (isCompanyAdmin) {
    const companyItems = featureHubs
      ? [...COMPANY_ITEMS.slice(0, 4), HUB_ITEM, ...COMPANY_ITEMS.slice(4)]
      : COMPANY_ITEMS;
    sections.push({ title: "Company", items: companyItems });
  }

  if (isSuperAdmin) {
    sections.push({ title: "Platform", items: PLATFORM_ITEMS });
  }

  return (
    <nav className="w-48 shrink-0 space-y-6 sticky top-6 self-start">
      {sections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
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
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
