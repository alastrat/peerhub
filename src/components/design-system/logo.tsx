import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  className?: string;
  /** false shows only the leaves mark, for narrow spaces like the sidebar rail. */
  showText?: boolean;
  /** "white" for dark or brand-colored backgrounds. */
  variant?: "color" | "white";
}

export function Logo({ className, showText = true, variant = "color" }: LogoProps) {
  if (!showText) {
    return (
      <Image
        src="/brand/kultiva-mark.png"
        alt="Kultiva"
        width={125}
        height={122}
        priority
        className={cn("h-8 w-auto", className)}
      />
    );
  }

  return (
    <Image
      src={variant === "white" ? "/brand/kultiva-logo-white.png" : "/brand/kultiva-logo.png"}
      alt="Kultiva"
      width={735}
      height={270}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );
}
