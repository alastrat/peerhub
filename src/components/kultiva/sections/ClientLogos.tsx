"use client";

import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { AnimatedElement } from "../ui/AnimatedElement";

// Placeholder logos - will be replaced with actual client logos
const clients = [
  { name: "Business Integrity", logo: "/kultiva/images/clients/client1.png" },
  { name: "Constructora Habitat", logo: "/kultiva/images/clients/client2.png" },
  { name: "Fintra SAS", logo: "/kultiva/images/clients/client3.png" },
  { name: "Company 4", logo: "/kultiva/images/clients/client4.png" },
  { name: "Company 5", logo: "/kultiva/images/clients/client5.png" },
  { name: "Company 6", logo: "/kultiva/images/clients/client6.png" },
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
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
