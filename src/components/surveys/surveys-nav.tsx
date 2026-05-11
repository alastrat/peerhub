"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";
import {
  Thermometer,
  Activity,
  Crown,
  Heart,
  TrendingUp,
  BarChart3,
  ClipboardList,
} from "lucide-react";

// The nav routes the 6 survey-type filters at the existing /surveys/climate
// list (filtered by ?type=…) plus the shared /surveys/climate/templates page.
// The legacy /surveys/360 routes still exist but are no longer surfaced here.
interface NavItem {
  href: string;
  // Matches when usePathname starts with this prefix. Mostly equals href, but
  // the type filters share /surveys/climate so we also need the type param.
  typeParam?: string;
  labelKey: string;
  icon: LucideIcon;
}

const EVALUATION_ITEMS: NavItem[] = [
  {
    href: "/surveys/climate?type=CLIMATE",
    typeParam: "CLIMATE",
    labelKey: "evaluations.climate",
    icon: Thermometer,
  },
  {
    href: "/surveys/climate?type=PULSE",
    typeParam: "PULSE",
    labelKey: "evaluations.pulse",
    icon: Activity,
  },
  {
    href: "/surveys/climate?type=LEADERSHIP",
    typeParam: "LEADERSHIP",
    labelKey: "evaluations.leadership",
    icon: Crown,
  },
  {
    href: "/surveys/climate?type=CULTURE",
    typeParam: "CULTURE",
    labelKey: "evaluations.culture",
    icon: Heart,
  },
  {
    href: "/surveys/climate?type=PERFORMANCE",
    typeParam: "PERFORMANCE",
    labelKey: "evaluations.performance",
    icon: TrendingUp,
  },
  {
    href: "/surveys/climate?type=ENPS",
    typeParam: "ENPS",
    labelKey: "evaluations.nps",
    icon: BarChart3,
  },
  {
    href: "/surveys/climate/templates",
    labelKey: "evaluations.templates",
    icon: ClipboardList,
  },
];

export function SurveysNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard.surveys_nav");

  const currentType = searchParams.get("type");
  const isTemplatesPath = pathname.startsWith("/surveys/climate/templates");

  return (
    <nav className="w-48 shrink-0 space-y-6 sticky top-6 self-start">
      <div>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("evaluations.title")}
        </p>
        <div className="space-y-1">
          {EVALUATION_ITEMS.map((item) => {
            const isActive = item.typeParam
              ? !isTemplatesPath &&
                pathname.startsWith("/surveys/climate") &&
                currentType === item.typeParam
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
