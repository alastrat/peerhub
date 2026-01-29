import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size], className)} />
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
