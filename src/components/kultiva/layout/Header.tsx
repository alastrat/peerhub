"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: string;
  children?: { href: string; labelKey: string }[];
}

const navItems: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/nosotros", labelKey: "about" },
  {
    href: "/servicios",
    labelKey: "services",
    children: [
      { href: "/servicios", labelKey: "services_all" },
      { href: "/servicios/cultura", labelKey: "cultura" },
      { href: "/servicios/seleccion-especializada", labelKey: "seleccion" },
      { href: "/servicios/cambio", labelKey: "cambio" },
      { href: "/servicios/comunicacion-interna", labelKey: "comunicacion" },
    ],
  },
  { href: "/diagnostico-clima", labelKey: "climate" },
  { href: "/conferencias", labelKey: "conferences" },
  { href: "/herramientas", labelKey: "tools" },
  { href: "/blog", labelKey: "blog" },
  { href: "/contacto", labelKey: "contact" },
];

export function Header() {
  const t = useTranslations("navigation");
  const tServices = useTranslations("services");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getLabel = (item: NavItem | { href: string; labelKey: string }) => {
    // Service sub-items use services translation namespace
    if (item.href.startsWith("/servicios/") && item.href !== "/servicios") {
      const serviceKey = item.labelKey as "cultura" | "seleccion" | "cambio" | "comunicacion";
      return tServices(`${serviceKey}.short`);
    }
    return t(item.labelKey);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="kultiva-container">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span
              className={cn(
                "text-2xl font-bold font-kanit transition-colors",
                isScrolled ? "text-kultiva-ink" : "text-white"
              )}
            >
              Kultiva
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() =>
                  item.children && setOpenDropdown(item.labelKey)
                }
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                    isScrolled
                      ? "text-kultiva-charcoal hover:text-kultiva-primary hover:bg-kultiva-sand"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  {getLabel(item)}
                  {item.children && <ChevronDown className="w-4 h-4" />}
                </Link>

                {/* Dropdown */}
                {item.children && openDropdown === item.labelKey && (
                  <div className="absolute top-full left-0 pt-2">
                    <div className="bg-white rounded-xl shadow-xl border border-kultiva-sand py-2 min-w-[220px]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-kultiva-charcoal hover:text-kultiva-primary hover:bg-kultiva-cream transition-colors"
                        >
                          {getLabel(child)}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher isScrolled={isScrolled} />

            <Link
              href="/contacto"
              className={cn(
                "hidden md:inline-flex kultiva-btn text-sm py-2.5 px-5",
                isScrolled ? "kultiva-btn-primary" : "kultiva-btn-outline border-white text-white hover:bg-white hover:text-kultiva-primary"
              )}
            >
              {t("cta")}
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                isScrolled
                  ? "text-kultiva-charcoal hover:bg-kultiva-sand"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-xl border-t border-kultiva-sand">
          <nav className="kultiva-container py-4">
            {navItems.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-3 text-kultiva-charcoal hover:text-kultiva-primary hover:bg-kultiva-cream rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {getLabel(item)}
                </Link>
                {item.children && (
                  <div className="pl-4">
                    {item.children.slice(1).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-kultiva-stone hover:text-kultiva-primary hover:bg-kultiva-cream rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {getLabel(child)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-4 px-4">
              <Link
                href="/contacto"
                className="kultiva-btn kultiva-btn-primary w-full justify-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("cta")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
