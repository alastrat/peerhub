"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { submitContactForm } from "@/lib/actions/contact";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactFormSection() {
  const t = useTranslations("contact.form");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("submitting");
    const result = await submitContactForm({
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      message: String(data.get("message") || ""),
    });

    if (result.success) {
      setStatus("success");
      form.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <section className="bizzen-contact_two pt-80 pb-120">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6 col-lg-10">
            <div
              className="map-box mb-5 mb-xl-0"
              data-aos="fade-up"
              data-aos-duration="1300"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125221.51098779548!2d-74.87478169999999!3d10.96389565!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d4ec6d0a8ef%3A0x1fbb1b0ccbb57d31!2sBarranquilla%2C%20Atlantico%2C%20Colombia!5e0!3m2!1sen!2sus!4v1640000000000!5m2!1sen!2sus"
                loading="lazy"
                title="Ubicación de Kultiva"
              />
            </div>
          </div>
          <div className="col-xl-6 col-lg-10">
            <div
              className="contact-wrapper"
              data-aos="fade-left"
              data-aos-duration="1400"
            >
              <h2>{t("title")}</h2>
              <form
                id="contact-form"
                className="contact-form"
                onSubmit={onSubmit}
                noValidate
              >
                <div className="row">
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input
                        type="text"
                        className="form_control"
                        placeholder={t("name_placeholder")}
                        name="name"
                        required
                        disabled={status === "submitting"}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input
                        type="email"
                        className="form_control"
                        placeholder={t("email_placeholder")}
                        name="email"
                        required
                        disabled={status === "submitting"}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input
                        type="tel"
                        className="form_control"
                        placeholder={t("phone_placeholder")}
                        name="phone"
                        disabled={status === "submitting"}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <textarea
                        className="form_control"
                        placeholder={t("message_placeholder")}
                        name="message"
                        rows={5}
                        disabled={status === "submitting"}
                      />
                    </div>
                  </div>
                  <div className="col-lg-12">
                    <div className="form-group">
                      <button
                        type="submit"
                        className="theme-btn style-one"
                        disabled={status === "submitting"}
                      >
                        {status === "submitting" ? "..." : t("submit")}{" "}
                        <i className="far fa-arrow-right" />
                      </button>
                    </div>
                  </div>
                  {status === "success" && (
                    <div className="col-lg-12">
                      <p
                        role="status"
                        style={{
                          color: "#1f7a44",
                          background: "#e8f7ee",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          margin: 0,
                        }}
                      >
                        {t("success")}
                      </p>
                    </div>
                  )}
                  {status === "error" && (
                    <div className="col-lg-12">
                      <p
                        role="alert"
                        style={{
                          color: "#a4262c",
                          background: "#fdecea",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          margin: 0,
                        }}
                      >
                        {t("error")}
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
