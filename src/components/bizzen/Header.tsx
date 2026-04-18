"use client";

import { cn } from "@/lib/utils/cn";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Menu, X, ChevronDown } from "lucide-react";
import Image from "next/image";
import React from "react";

export function Header() {
  const t = useTranslations("navigation");
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [scrollDirection, setScrollDirection] = React.useState<"up" | "down">("up");
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const lastScrollY = React.useRef(0);
  const closeTimeout = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 15);
      setScrollDirection(currentY > lastScrollY.current ? "down" : "up");
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = () => setOpen(false);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const openDropdown = (name: string) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setActiveDropdown(name);
  };

  const closeDropdown = () => {
    closeTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const shouldShow = scrollDirection === "up" || !scrolled;

  const linkColor = scrolled
    ? "text-gray-900 hover:text-[#613171]"
    : "text-white/90 hover:text-white";
  const chevronColor = scrolled ? "opacity-50" : "opacity-70";

  return (
    <header
      className={cn(
        "fixed inset-x-3 top-4 z-50 mx-auto flex max-w-7xl transform-gpu items-center justify-center rounded-xl px-4 py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1.03)]",
        open ? "h-auto" : "h-14",
        scrolled || open
          ? "border border-gray-100 bg-white shadow-xl shadow-black/5 backdrop-blur-xl"
          : "border-0 bg-transparent",
        !shouldShow ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="flex w-full items-center">
        <div className="relative flex w-full items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Home">
              <Image
                src={scrolled ? "/images/logo.png" : "/images/logo-white.png"}
                alt="Kultiva"
                width={scrolled ? 100 : 120}
                height={scrolled ? 32 : 40}
                className="transition-all duration-300 ease-in-out"
              />
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:absolute md:left-1/2 md:top-1/2 md:block md:-translate-x-1/2 md:-translate-y-1/2 md:transform">
            <div className="flex items-center gap-6">
              <Link
                className={cn("px-2 py-1 text-sm font-medium transition-colors", linkColor)}
                href="/plataforma"
              >
                {t("platform")}
              </Link>

              <Link
                className={cn("px-2 py-1 text-sm font-medium transition-colors", linkColor)}
                href="/servicios"
              >
                {t("services")}
              </Link>

              <Link
                className={cn("px-2 py-1 text-sm font-medium transition-colors", linkColor)}
                href="/precios"
              >
                {t("pricing")}
              </Link>

              {/* Recursos — dropdown */}
              <div
                className="relative"
                onMouseEnter={() => openDropdown("resources")}
                onMouseLeave={closeDropdown}
              >
                <span className={cn("flex items-center gap-1 px-2 py-1 text-sm font-medium transition-colors cursor-default", linkColor)}>
                  {t("resources")}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-opacity", chevronColor, activeDropdown === "resources" && "opacity-100")} />
                </span>
                <div
                  className={cn(
                    "absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition-all duration-200",
                    activeDropdown === "resources" ? "visible opacity-100" : "invisible opacity-0",
                  )}
                >
                  <div className="w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl shadow-black/5">
                    <Link href="/nosotros" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#613171]/5 hover:text-[#613171] transition-colors">
                      {t("about")}
                    </Link>
                    <Link href="/blog" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#613171]/5 hover:text-[#613171] transition-colors">
                      {t("blog")}
                    </Link>
                    <Link href="/conferencias" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#613171]/5 hover:text-[#613171] transition-colors">
                      {t("conferences")}
                    </Link>
                    <Link href="/herramientas" className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-[#613171]/5 hover:text-[#613171] transition-colors">
                      {t("tools")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Desktop Right */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <LanguageSwitcher scrolled={scrolled} />
            <Link href="/demo" className="theme-btn style-one">
              {t("cta")}
              <i className="far fa-arrow-right" />
            </Link>
          </div>

          {/* Mobile Right */}
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/demo" className="theme-btn style-one" style={{ fontSize: "13px", padding: "8px 16px" }}>
              {t("cta")}
              <i className="far fa-arrow-right" />
            </Link>
            <button
              onClick={() => setOpen(!open)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg p-2 transition-colors",
                scrolled || open
                  ? "text-gray-700 hover:bg-gray-100"
                  : "text-white hover:bg-white/10",
              )}
            >
              {open ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav
          className={cn(
            "my-6 flex flex-col text-lg ease-in-out will-change-transform md:hidden",
            open ? "" : "hidden",
          )}
        >
          <ul className="space-y-4 font-medium">
            <li onClick={() => setOpen(false)}>
              <Link href="/plataforma" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("platform")}
              </Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/servicios" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("services")}
              </Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/precios" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("pricing")}
              </Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/nosotros" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("about")}
              </Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/blog" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("blog")}
              </Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/conferencias" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("conferences")}
              </Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/herramientas" className="text-gray-900 hover:text-[#613171] transition-colors">
                {t("tools")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
