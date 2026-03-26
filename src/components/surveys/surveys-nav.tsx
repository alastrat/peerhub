"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const REVIEW_360_ITEMS: NavItem[] = [
  { href: "/surveys/360", label: "Review Cycles", icon: RotateCcw },
  { href: "/surveys/360/templates", label: "Templates", icon: FileText },
];

const CLIMATE_ITEMS: NavItem[] = [
  { href: "/surveys/climate", label: "Surveys", icon: Thermometer },
  { href: "/surveys/climate/templates", label: "Templates", icon: ClipboardList },
];

const SECTIONS: NavSection[] = [
  { title: "360 Reviews", items: REVIEW_360_ITEMS },
  { title: "Org Climate", items: CLIMATE_ITEMS },
];

export function SurveysNav() {
  const pathname = usePathname();

  return (
    <nav className="w-48 shrink-0 space-y-6 sticky top-6 self-start">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
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
