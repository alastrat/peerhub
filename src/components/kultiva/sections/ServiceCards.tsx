"use client";

import { useTranslations } from "next-intl";
import { SectionTitle } from "../ui/SectionTitle";
import { ServiceCard } from "../ui/Card";
import { AnimatedElement } from "../ui/AnimatedElement";
import { Users, Shuffle, MessageSquare, Search } from "lucide-react";

const services = [
  {
    key: "cultura",
    href: "/servicios/cultura",
    icon: Users,
  },
  {
    key: "seleccion",
    href: "/servicios/seleccion-especializada",
    icon: Search,
  },
  {
    key: "cambio",
    href: "/servicios/cambio",
    icon: Shuffle,
  },
  {
    key: "comunicacion",
    href: "/servicios/comunicacion-interna",
    icon: MessageSquare,
  },
];

export function ServiceCards() {
  const t = useTranslations("home.services");
  const tServices = useTranslations("services");

  return (
    <section className="kultiva-section bg-kultiva-cream">
      <div className="kultiva-container">
        <AnimatedElement animation="fade-up">
          <SectionTitle
            subtitle={t("subtitle")}
            title={t("title")}
            description={t("description")}
            centered
          />
        </AnimatedElement>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <AnimatedElement
              key={service.key}
              animation="fade-up"
              delay={100 + index * 100}
            >
              <ServiceCard
                icon={<service.icon className="w-7 h-7" />}
                title={tServices(`${service.key}.title`)}
                description={tServices(`${service.key}.description`)}
                href={service.href}
              />
            </AnimatedElement>
          ))}
        </div>
      </div>
    </section>
  );
}
