"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  UsersRound,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/design-system/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const adminNavItems = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/people", icon: Users, label: "People" },
  { href: "/surveys", icon: ClipboardCheck, label: "Surveys" },
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

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            isActive
              ? "bg-[#613171] text-white shadow-sm"
              : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.companyUser?.role || "MEMBER";

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER" || role === "ADMIN";

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <TooltipProvider>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center bg-muted py-4">
        {/* Logo */}
        <div className="mb-6">
          <Logo showText={false} />
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <NavItem key={item.href} {...item} isActive={isActive} />
            );
          })}

          {/* Manager-specific items */}
          {isManager && !isAdmin && (
            <>
              <div className="my-2 h-px w-8 bg-border" />
              {managerNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <NavItem key={item.href} {...item} isActive={isActive} />
                );
              })}
            </>
          )}
        </nav>

        {/* Settings */}
        <div className="mt-auto">
          <NavItem
            href="/settings"
            icon={Settings}
            label="Settings"
            isActive={pathname.startsWith("/settings")}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
