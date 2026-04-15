"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

interface LanguageSwitcherProps {
  scrolled?: boolean;
}

export function LanguageSwitcher({ scrolled = true }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: "es" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  const activeColor = scrolled ? "text-[#613171]" : "text-white";
  const inactiveColor = scrolled
    ? "text-gray-400 hover:text-gray-600"
    : "text-white/50 hover:text-white/80";
  const separatorColor = scrolled ? "text-gray-300" : "text-white/30";

  return (
    <div className="flex items-center gap-1.5 mr-2">
      <button
        onClick={() => switchLocale("es")}
        className={`text-sm transition-colors ${
          locale === "es" ? `font-bold ${activeColor}` : `font-normal ${inactiveColor}`
        }`}
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        ES
      </button>
      <span className={separatorColor}>|</span>
      <button
        onClick={() => switchLocale("en")}
        className={`text-sm transition-colors ${
          locale === "en" ? `font-bold ${activeColor}` : `font-normal ${inactiveColor}`
        }`}
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        EN
      </button>
    </div>
  );
}
