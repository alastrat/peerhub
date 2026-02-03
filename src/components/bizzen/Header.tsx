"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("navigation");
  const tServices = useTranslations("services");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        className={`offcanvas__overlay ${mobileMenuOpen ? "active" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Header Area - exact template structure */}
      <header className={`header-area header-one ${isSticky ? "sticky" : ""}`}>
        {/* Header Navigation */}
        <div className="header-navigation">
          <div className="container-fluid">
            {/* Primary Menu */}
            <div className="primary-menu">
              {/* Site Branding */}
              <div className="site-branding">
                <Link href="/" className="brand-logo">
                  <img
                    src="/images/logo-new.png"
                    alt="Kultiva"
                  />
                </Link>
              </div>

              {/* Theme Nav Menu */}
              <div 
                className={`theme-nav-menu ${mobileMenuOpen ? "menu-on" : ""}`}
                style={{
                  backgroundColor: "#053331",
                }}
              >
                {/* Menu Top (Mobile) */}
                <div className="theme-menu-top d-block d-xl-none">
                  <div className="site-branding">
                    <Link href="/" className="brand-logo">
                      <img
                        src="/images/logo-new.png"
                        alt="Kultiva"
                      />
                    </Link>
                  </div>
                </div>

                {/* Main Menu */}
                <nav className="main-menu">
                  <ul style={{ color: "#fff" }}>
                    <li className="menu-item">
                      <Link href="/" style={{ color: "#fff" }}>{t("home")}</Link>
                    </li>
                    <li className="menu-item">
                      <Link href="/nosotros" style={{ color: "#fff" }}>{t("about")}</Link>
                    </li>
                    <li className="menu-item has-children">
                      <Link href="/servicios" style={{ color: "#fff" }}>{t("services")}</Link>
                      <ul className="sub-menu" style={{ backgroundColor: "#3d7a50" }}>
                        <li>
                          <Link href="/servicios" style={{ color: "#fff" }}>{t("services_all")}</Link>
                        </li>
                        <li>
                          <Link href="/servicios/cultura" style={{ color: "#fff" }}>
                            {tServices("cultura.title")}
                          </Link>
                        </li>
                        <li>
                          <Link href="/servicios/seleccion-especializada" style={{ color: "#fff" }}>
                            {tServices("seleccion.title")}
                          </Link>
                        </li>
                        <li>
                          <Link href="/servicios/cambio" style={{ color: "#fff" }}>
                            {tServices("cambio.title")}
                          </Link>
                        </li>
                        <li>
                          <Link href="/servicios/comunicacion-interna" style={{ color: "#fff" }}>
                            {tServices("comunicacion.title")}
                          </Link>
                        </li>
                        <li>
                          <Link href="/diagnostico-clima" style={{ color: "#fff" }}>{t("climate")}</Link>
                        </li>
                      </ul>
                    </li>
                    <li className="menu-item has-children">
                      <a href="#">{t("resources")}</a>
                      <ul className="sub-menu">
                        <li>
                          <Link href="/conferencias" style={{ color: "#fff" }}>{t("conferences")}</Link>
                        </li>
                        <li>
                          <Link href="/herramientas" style={{ color: "#fff" }}>{t("tools")}</Link>
                        </li>
                        <li>
                          <Link href="/blog" style={{ color: "#fff" }}>{t("blog")}</Link>
                        </li>
                      </ul>
                    </li>
                    <li className="menu-item">
                      <Link href="/contacto" style={{ color: "#fff" }}>{t("contact")}</Link>
                    </li>
                  </ul>
                </nav>

                {/* Nav Button (Mobile) */}
                <div className="theme-nav-button mt-20 d-block d-md-none">
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta")}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>

                {/* Menu Bottom (Mobile) */}
                <div className="theme-menu-bottom mt-50 d-block d-xl-none">
                  <h5 style={{ color: "#fff" }}>Síguenos</h5>
                  <ul className="social-link">
                    <li>
                      <a
                        href="https://www.instagram.com/kultiva.co"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#fff", borderColor: "#fff" }}
                      >
                        <i className="fab fa-instagram" />
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.linkedin.com/company/kultiva-consultoria"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#fff", borderColor: "#fff" }}
                      >
                        <i className="fab fa-linkedin-in" />
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.youtube.com/@kultiva"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#fff", borderColor: "#fff" }}
                      >
                        <i className="fab fa-youtube" />
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Header Nav Right */}
              <div className="nav-right-item">
                <LanguageSwitcher />
                <div className="nav-button d-none d-md-block">
                  <Link href="/contacto" className="theme-btn style-one">
                    {t("cta")}
                    <i className="far fa-arrow-right" />
                  </Link>
                </div>
                <div
                  className={`navbar-toggler ${mobileMenuOpen ? "active" : ""}`}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  style={{ cursor: "pointer" }}
                >
                  {mobileMenuOpen ? (
                    <i className="fas fa-times" style={{ fontSize: "24px" }} />
                  ) : (
                    <i className="fas fa-bars" style={{ fontSize: "24px" }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
