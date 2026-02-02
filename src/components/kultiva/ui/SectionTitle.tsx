import { cn } from "@/lib/utils";

interface SectionTitleProps {
  subtitle?: string;
  title: string;
  description?: string;
  centered?: boolean;
  light?: boolean;
  className?: string;
}

export function SectionTitle({
  subtitle,
  title,
  description,
  centered = false,
  light = false,
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "mb-10 lg:mb-14",
        centered && "text-center",
        className
      )}
    >
      {subtitle && (
        <span
          className={cn(
            "kultiva-subtitle",
            light && "text-kultiva-accent before:bg-kultiva-accent"
          )}
        >
          {subtitle}
        </span>
      )}
      <h2
        className={cn(
          "kultiva-title",
          light && "text-white"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "kultiva-lead max-w-2xl",
            centered && "mx-auto",
            light && "text-white/80"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
