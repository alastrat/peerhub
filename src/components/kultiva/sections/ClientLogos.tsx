"use client";

import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { AnimatedElement } from "../ui/AnimatedElement";

const clients = [
  { name: "Business Integrity Services", logo: "/images/clients/client-1.png" },
  { name: "Constructora Habitat De Los Andes", logo: "/images/clients/client-2.png" },
  { name: "Fintra SAS", logo: "/images/clients/client-3.png" },
  { name: "Marymount", logo: "/images/clients/client-4.png" },
  { name: "AMCHAM Colombia", logo: "/images/clients/client-5.png" },
];

export function ClientLogos() {
  const t = useTranslations("home.clients");

  return (
    <section className="kultiva-section">
      <div className="kultiva-container">
        <AnimatedElement animation="fade-up">
          <SectionTitle
            subtitle={t("subtitle")}
            title={t("title")}
            centered
          />
        </AnimatedElement>

        <AnimatedElement animation="fade-up" delay={200}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center">
            {clients.map((client, index) => (
              <div
                key={index}
                className="flex items-center justify-center p-4 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              >
                <img
                  src={client.logo}
                  alt={client.name}
                  className="max-h-12 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}
