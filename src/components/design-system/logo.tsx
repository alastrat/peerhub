import { cn } from "@/lib/utils/cn";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-primary-foreground"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight">Kultiva</span>
      )}
    </div>
  );
}
