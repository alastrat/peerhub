"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const services = [
  { href: "/servicios/cultura", labelKey: "cultura" },
  { href: "/servicios/seleccion-especializada", labelKey: "seleccion" },
  { href: "/servicios/cambio", labelKey: "cambio" },
  { href: "/servicios/comunicacion-interna", labelKey: "comunicacion" },
];

const company = [
  { href: "/nosotros", labelKey: "about" },
  { href: "/conferencias", labelKey: "conferences" },
  { href: "/herramientas", labelKey: "tools" },
  { href: "/blog", labelKey: "blog" },
  { href: "/faq", labelKey: "faq" },
];

const socialLinks = [
  {
    href: "https://www.instagram.com/kultiva.co",
    icon: Instagram,
    label: "Instagram",
  },
  {
    href: "https://www.linkedin.com/company/kultiva-consultoria",
    icon: Linkedin,
    label: "LinkedIn",
  },
  { href: "https://www.youtube.com/@kultiva", icon: Youtube, label: "YouTube" },
  {
    href: "https://www.facebook.com/kultiva.co",
    icon: Facebook,
    label: "Facebook",
  },
];

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("navigation");
  const tServices = useTranslations("services");
  const tContact = useTranslations("contact");

  return (
    <footer className="bg-kultiva-ink text-white">
      {/* Main Footer */}
      <div className="kultiva-container py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-6">
              <span className="text-2xl font-bold font-kanit text-white">
                Kultiva
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {t("description")}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-kultiva-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h4 className="text-lg font-semibold mb-6">{t("services")}</h4>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service.href}>
                  <Link
                    href={service.href}
                    className="text-white/70 hover:text-kultiva-accent transition-colors text-sm"
                  >
                    {tServices(`${service.labelKey}.title`)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/diagnostico-clima"
                  className="text-white/70 hover:text-kultiva-accent transition-colors text-sm"
                >
                  {tNav("climate")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-lg font-semibold mb-6">{t("company")}</h4>
            <ul className="space-y-3">
              {company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/70 hover:text-kultiva-accent transition-colors text-sm"
                  >
                    {tNav(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="text-lg font-semibold mb-6">{t("contact")}</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-kultiva-accent flex-shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm">
                  {tContact("info.address.value")}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-kultiva-accent flex-shrink-0" />
                <a
                  href="tel:+573006455082"
                  className="text-white/70 hover:text-kultiva-accent transition-colors text-sm"
                >
                  {tContact("info.phone.value")}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-kultiva-accent flex-shrink-0" />
                <a
                  href="mailto:info@kultiva.com.co"
                  className="text-white/70 hover:text-kultiva-accent transition-colors text-sm"
                >
                  {tContact("info.email.value")}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="kultiva-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              &copy; {new Date().getFullYear()} Kultiva. {t("copyright")}
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacidad"
                className="text-white/50 hover:text-white/70 text-sm transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/terminos"
                className="text-white/50 hover:text-white/70 text-sm transition-colors"
              >
                {t("terms")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
