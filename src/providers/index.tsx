"use client";

import { AuthProvider } from "./auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={0}>
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </AuthProvider>
  );
}
