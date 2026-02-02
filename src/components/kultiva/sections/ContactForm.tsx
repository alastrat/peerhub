"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "../ui/Button";
import { AnimatedElement } from "../ui/AnimatedElement";
import { Send, MapPin, Phone, Mail, Clock } from "lucide-react";

const services = [
  { key: "cultura", value: "cultura" },
  { key: "seleccion", value: "seleccion-especializada" },
  { key: "cambio", value: "cambio" },
  { key: "comunicacion", value: "comunicacion-interna" },
  { key: "climate", value: "diagnostico-clima" },
];

export function ContactForm() {
  const t = useTranslations("contact");
  const tServices = useTranslations("services");
  const tNav = useTranslations("navigation");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: Implement form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: MapPin,
      titleKey: "address",
      valueKey: "address",
    },
    {
      icon: Phone,
      titleKey: "phone",
      valueKey: "phone",
      href: "tel:+573006455082",
    },
    {
      icon: Mail,
      titleKey: "email",
      valueKey: "email",
      href: "mailto:info@kultiva.com.co",
    },
    {
      icon: Clock,
      titleKey: "hours",
      valueKey: "hours",
    },
  ];

  return (
    <section className="kultiva-section">
      <div className="kultiva-container">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Contact Info */}
          <div className="lg:col-span-2">
            <AnimatedElement animation="fade-right">
              <span className="kultiva-subtitle">{t("subtitle")}</span>
              <h2 className="kultiva-title">{t("title")}</h2>
              <p className="kultiva-lead mb-8">{t("description")}</p>

              <div className="space-y-6">
                {contactInfo.map((item) => (
                  <div key={item.titleKey} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-kultiva-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-kultiva-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-kultiva-ink mb-1">
                        {t(`info.${item.titleKey}.title`)}
                      </h4>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-kultiva-charcoal/70 hover:text-kultiva-primary transition-colors"
                        >
                          {t(`info.${item.valueKey}.value`)}
                        </a>
                      ) : (
                        <p className="text-kultiva-charcoal/70">
                          {t(`info.${item.valueKey}.value`)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedElement>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <AnimatedElement animation="fade-left" delay={200}>
              <form
                onSubmit={handleSubmit}
                className="kultiva-card bg-white p-8 lg:p-10"
              >
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-kultiva-ink mb-2"
                    >
                      {t("form.name")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-kultiva-ink mb-2"
                    >
                      {t("form.email")}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-kultiva-ink mb-2"
                    >
                      {t("form.phone")}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="w-full px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-kultiva-ink mb-2"
                    >
                      {t("form.company")}
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      className="w-full px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="service"
                    className="block text-sm font-medium text-kultiva-ink mb-2"
                  >
                    {t("form.service")}
                  </label>
                  <select
                    id="service"
                    name="service"
                    className="w-full px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors bg-white"
                  >
                    <option value="">{t("form.service_placeholder")}</option>
                    {services.map((service) => (
                      <option key={service.value} value={service.value}>
                        {service.key === "climate"
                          ? tNav("climate")
                          : tServices(`${service.key}.title`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-kultiva-ink mb-2"
                  >
                    {t("form.message")}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    placeholder={t("form.message_placeholder")}
                    className="w-full px-4 py-3 rounded-xl border border-kultiva-border focus:border-kultiva-primary focus:ring-2 focus:ring-kultiva-primary/20 outline-none transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full justify-center"
                >
                  {isSubmitting ? (
                    "Enviando..."
                  ) : (
                    <>
                      {t("form.submit")}
                      <Send className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            </AnimatedElement>
          </div>
        </div>
      </div>
    </section>
  );
}
