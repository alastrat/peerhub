"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import {
  RotateCcw,
  FileText,
  Thermometer,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const REVIEW_360_ITEMS: NavItem[] = [
  { href: "/surveys/360", labelKey: "review_360.cycles", icon: RotateCcw },
  { href: "/surveys/360/templates", labelKey: "review_360.templates", icon: FileText },
];

const CLIMATE_ITEMS: NavItem[] = [
  { href: "/surveys/climate", labelKey: "climate.surveys", icon: Thermometer },
  { href: "/surveys/climate/templates", labelKey: "climate.templates", icon: ClipboardList },
];

const SECTIONS: NavSection[] = [
  { titleKey: "review_360.title", items: REVIEW_360_ITEMS },
  { titleKey: "climate.title", items: CLIMATE_ITEMS },
];

export function SurveysNav() {
  const pathname = usePathname();
  const t = useTranslations("dashboard.surveys_nav");

  return (
    <nav className="w-48 shrink-0 space-y-6 sticky top-6 self-start">
      {SECTIONS.map((section) => (
        <div key={section.titleKey}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t(section.titleKey)}
          </p>
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
