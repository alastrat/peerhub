"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const tContact = useTranslations("contact");

  return (
    <footer className="main-footer">
      <div className="footer-shape">
        <img src="/bizzen/images/footer/footer-shape.png" alt="footer shape" />
      </div>

      {/* Footer Widget Wrapper */}
      <div className="footer-widget-wrapper">
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              {/* Footer Widget - About */}
              <div
                className="footer-widget footer-about-widget pt-100"
              >
                <div className="widget-content">
                  <div className="footer-logo mb-20">
                    <Link href="/">
                      <img
                        src="/images/logo-white.png"
                        alt="Kultiva"
                      />
                    </Link>
                  </div>
                  <p className="mb-20">{t("description")}</p>
                  <form>
                    <div className="form-group">
                      <input
                        type="email"
                        className="form_control"
                        placeholder="Ingresa tu correo"
                        name="email"
                        required
                      />
                      <button className="submit-btn" type="submit">
                        <i className="far fa-paper-plane" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              {/* Footer Widget Inner */}
              <div className="footer-widget-inner">
                {/* Footer Top */}
                <div
                  className="footer-top"
                >
                  <div className="big-text" style={{ fontSize: '42px' }}>{t("big_text")}</div>
                  <div style={{ marginTop: "20px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <Link
                      href="/demo"
                      className="theme-btn style-one"
                      style={{ padding: "12px 24px", fontSize: "14px" }}
                    >
                      {t("cta_demo")}
                    </Link>
                    <Link
                      href="/precios"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "12px 24px",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: "14px",
                        textDecoration: "none",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                      }}
                    >
                      {t("cta_pricing")}
                    </Link>
                  </div>
                </div>

                <div className="footer-widget-area">
                  <div className="row">
                    <div className="col-md-4">
                      {/* Footer Widget - Contact */}
                      <div
                        className="footer-widget footer-contact-info-widget mb-40"
                      >
                        <div className="widget-content">
                          <h6>{tContact("info.address.title")}</h6>
                          <ul>
                            <li>{tContact("info.address.value")}</li>
                            <li>
                              <a href="tel:+573006455082">
                                {tContact("info.phone.value")}
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      {/* Footer Widget - Email */}
                      <div
                        className="footer-widget footer-contact-info-widget mb-40"
                      >
                        <div className="widget-content">
                          <h6>{tContact("info.email.title")}</h6>
                          <ul>
                            <li>
                              <a href="mailto:info@kultiva.com.co">
                                {tContact("info.email.value")}
                              </a>
                            </li>
                            <li>{tContact("info.hours.value")}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      {/* Footer Widget - Social */}
                      <div
                        className="footer-widget footer-social-widget mb-40"
                      >
                        <h4 className="widget-title">{t("social")}:</h4>
                        <div className="widget-content">
                          <div className="social-box">
                            <a
                              href="https://www.instagram.com/kultiva.co"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <i className="fab fa-instagram" />
                            </a>
                            <a
                              href="https://www.linkedin.com/company/kultiva-consultoria"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <i className="fab fa-linkedin-in" />
                            </a>
                            <a
                              href="https://www.youtube.com/@kultiva"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <i className="fab fa-youtube" />
                            </a>
                            <a
                              href="https://www.facebook.com/kultiva.co"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <i className="fab fa-facebook-f" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Navigation Strip */}
      <div
        style={{
          padding: "32px 0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(0,0,0,0.15)",
        }}
      >
        <div className="container">
          <div className="row">
            <div className="col-md-3 col-6 mb-4 mb-md-0">
              <h6 style={{ color: "#fff", fontSize: "14px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>
                {t("nav.platform")}
              </h6>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/modulos/feedback-360" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Feedback 360
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/modulos/encuestas-clima" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Encuestas de Clima
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/modulos/gestion-personas" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Gestión de Personas
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/modulos/estructura-organizacional" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Estructura Org.
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-md-3 col-6 mb-4 mb-md-0">
              <h6 style={{ color: "#fff", fontSize: "14px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>
                {t("nav.resources")}
              </h6>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/blog" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Blog
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/herramientas" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Herramientas
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/diagnostico-clima" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Diagnóstico de Clima
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/faq" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-md-3 col-6 mb-4 mb-md-0">
              <h6 style={{ color: "#fff", fontSize: "14px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>
                {t("nav.company")}
              </h6>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/nosotros" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Nosotros
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/precios" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Precios
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/contacto" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Contacto
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/servicios" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Consultoría
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-md-3 col-6 mb-4 mb-md-0">
              <h6 style={{ color: "#fff", fontSize: "14px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>
                {t("nav.legal")}
              </h6>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/terminos" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Términos
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/privacidad" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Privacidad
                  </Link>
                </li>
                <li style={{ marginBottom: "6px" }}>
                  <Link href="/habeas-data" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", textDecoration: "none" }}>
                    Habeas Data
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Area */}
      <div className="copyright-area">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <div className="copyright-text text-md-start text-center">
                <p>
                  &copy; {new Date().getFullYear()} Kultiva. {t("copyright")}
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="copyright-link text-md-end text-center">
                <Link href="/terminos">{t("terms")}</Link>
                <Link href="/privacidad">{t("privacy")}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
