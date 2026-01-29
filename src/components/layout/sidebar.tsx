"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  FileText,
  RotateCcw,
  ClipboardList,
  BarChart3,
  Settings,
  UsersRound,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/design-system/logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const adminNavItems = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/people", icon: Users, label: "People" },
  { href: "/templates", icon: FileText, label: "Templates" },
  { href: "/cycles", icon: RotateCcw, label: "Review Cycles" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
];

const employeeNavItems = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/my-reviews", icon: ClipboardList, label: "My Reviews" },
  { href: "/my-feedback", icon: BarChart3, label: "My Feedback" },
];

const managerNavItems = [
  { href: "/team", icon: UsersRound, label: "My Team" },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.companyUser?.role || "EMPLOYEE";

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER" || role === "ADMIN";

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && <Logo />}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isCollapsed && "mx-auto")}
          onClick={onToggle}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Manager-specific items */}
          {isManager && !isAdmin && (
            <>
              <Separator className="my-4" />
              {managerNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Settings */}
      <div className="border-t p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            pathname.startsWith("/settings") && "bg-accent text-accent-foreground",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
