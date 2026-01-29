"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingPage } from "@/components/design-system/loading-spinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <LoadingPage />;
  }

  if (!session) {
    redirect("/login");
  }

  // If user doesn't have a company, redirect to onboarding
  if (!session.companyUser) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          sidebarCollapsed ? "pl-16" : "pl-64"
        )}
      >
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
