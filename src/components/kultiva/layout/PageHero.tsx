"use client";

import { Link } from "@/i18n/navigation";
import { ChevronRight, Home } from "lucide-react";

interface PageHeroProps {
  title: string;
  breadcrumb?: string;
  backgroundImage?: string;
}

export function PageHero({
  title,
  breadcrumb,
  backgroundImage = "/images/hero/hero-conference.jpg",
}: PageHeroProps) {
  return (
    <section
      className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(29, 107, 63, 0.95), rgba(29, 107, 63, 0.8)), url(${backgroundImage})`,
      }}
    >
      <div className="kultiva-container relative z-10">
        <div className="text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            {title}
          </h1>
          {breadcrumb && (
            <nav className="flex items-center justify-center gap-2 text-white/80">
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Inicio</span>
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-kultiva-accent">{breadcrumb}</span>
            </nav>
          )}
        </div>
      </div>

      {/* Decorative bottom curve */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z"
            fill="hsl(40 30% 97%)"
          />
        </svg>
      </div>
    </section>
  );
}
