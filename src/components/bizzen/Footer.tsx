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
                data-aos="fade-up"
                data-aos-duration="800"
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
                  data-aos="fade-up"
                  data-aos-duration="1000"
                >
                  <div className="big-text" style={{ fontSize: '42px' }}>¿Hablamos de tu negocio?</div>
                </div>

                <div className="footer-widget-area">
                  <div className="row">
                    <div className="col-md-4">
                      {/* Footer Widget - Contact */}
                      <div
                        className="footer-widget footer-contact-info-widget mb-40"
                        data-aos="fade-up"
                        data-aos-duration="1200"
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
                        data-aos="fade-up"
                        data-aos-duration="1400"
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
                        data-aos="fade-up"
                        data-aos-duration="1600"
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
