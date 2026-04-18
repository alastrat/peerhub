"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, LogOut, User, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils/formatting";
import { CompanySwitcher } from "@/components/layout/company-switcher";

const PAGE_TITLE_KEYS: Record<string, string> = {
  "/overview": "pages.overview",
  "/people": "pages.people",
  "/surveys": "pages.surveys",
  "/surveys/360": "pages.surveys_360",
  "/surveys/360/templates": "pages.surveys_360_templates",
  "/surveys/climate": "pages.surveys_climate",
  "/surveys/climate/templates": "pages.surveys_climate_templates",
  "/reports": "pages.reports",
  "/settings/profile": "pages.settings",
  "/settings/company": "pages.settings",
  "/settings/platform/companies": "pages.settings",
  "/settings/platform/users": "pages.settings",
  "/settings/platform/domains": "pages.settings",
  "/settings/platform/health": "pages.settings",
  "/settings": "pages.settings",
  "/my-reviews": "pages.my_reviews",
  "/my-feedback": "pages.my_feedback",
  "/team": "pages.my_team",
};

function getPageTitleKey(pathname: string): string {
  for (const [path, key] of Object.entries(PAGE_TITLE_KEYS)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return key;
    }
  }
  return "pages.dashboard";
}

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("dashboard.header");
  const user = session?.user;
  const companyUser = session?.companyUser;
  const pageTitleKey = getPageTitleKey(pathname);

  return (
    <header className="flex h-14 items-center gap-4 bg-muted px-6 sticky top-0 z-30">
      {/* Left: Company Switcher + Page title */}
      <div className="flex items-center gap-3">
        <CompanySwitcher />
        <span className="text-sm font-medium text-foreground">{t(pageTitleKey)}</span>
      </div>

      {/* Center: Search */}
      <div className="flex flex-1 justify-center">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("search_placeholder")}
            className="h-9 bg-background/60 ps-10 border-transparent focus-visible:border-input focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                <AvatarFallback className="text-xs">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || t("user_fallback")}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                {companyUser?.role && (
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {companyUser.role.toLowerCase()}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{t("menu.profile")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings/company" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("menu.settings")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("menu.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
