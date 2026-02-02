"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  isScrolled?: boolean;
}

export function LanguageSwitcher({ isScrolled = true }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: "es" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => switchLocale("es")}
        className={cn(
          "px-2 py-1 rounded transition-colors",
          locale === "es"
            ? isScrolled
              ? "text-kultiva-primary font-bold"
              : "text-white font-bold"
            : isScrolled
              ? "text-kultiva-stone hover:text-kultiva-primary"
              : "text-white/60 hover:text-white"
        )}
      >
        ES
      </button>
      <span
        className={cn(
          "text-xs",
          isScrolled ? "text-kultiva-stone" : "text-white/40"
        )}
      >
        |
      </span>
      <button
        onClick={() => switchLocale("en")}
        className={cn(
          "px-2 py-1 rounded transition-colors",
          locale === "en"
            ? isScrolled
              ? "text-kultiva-primary font-bold"
              : "text-white font-bold"
            : isScrolled
              ? "text-kultiva-stone hover:text-kultiva-primary"
              : "text-white/60 hover:text-white"
        )}
      >
        EN
      </button>
    </div>
  );
}
