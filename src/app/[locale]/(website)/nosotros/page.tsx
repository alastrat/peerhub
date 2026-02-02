import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { SectionTitle } from "@/components/kultiva/ui";
import { AnimatedElement } from "@/components/kultiva/ui/AnimatedElement";
import { CounterSection } from "@/components/kultiva/sections";
import { Check, Lightbulb, Users, Award, Heart } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: t("hero.title"),
  };
}

const values = [
  { key: "integrity", icon: Check },
  { key: "innovation", icon: Lightbulb },
  { key: "collaboration", icon: Users },
  { key: "excellence", icon: Award },
];

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />

      {/* Mission & Vision */}
      <section className="kultiva-section">
        <div className="kultiva-container">
          <div className="grid md:grid-cols-2 gap-8">
            <AnimatedElement animation="fade-right">
              <div className="kultiva-card bg-kultiva-primary text-white p-8 lg:p-10 h-full">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{t("mission.title")}</h3>
                <p className="text-white/80 leading-relaxed">
                  {t("mission.description")}
                </p>
              </div>
            </AnimatedElement>

            <AnimatedElement animation="fade-left" delay={100}>
              <div className="kultiva-card kultiva-card-bordered p-8 lg:p-10 h-full">
                <div className="kultiva-icon-box">
                  <Lightbulb className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{t("vision.title")}</h3>
                <p className="text-kultiva-charcoal/70 leading-relaxed">
                  {t("vision.description")}
                </p>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </section>

      {/* Counter */}
      <CounterSection variant="light" />

      {/* Values */}
      <section className="kultiva-section">
        <div className="kultiva-container">
          <AnimatedElement animation="fade-up">
            <SectionTitle
              subtitle={t("values.subtitle")}
              title={t("values.title")}
              centered
            />
          </AnimatedElement>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <AnimatedElement
                key={value.key}
                animation="fade-up"
                delay={100 + index * 100}
              >
                <div className="kultiva-card kultiva-card-bordered text-center p-8">
                  <div className="kultiva-icon-box mx-auto">
                    <value.icon className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-semibold mb-3">
                    {t(`values.${value.key}.title`)}
                  </h4>
                  <p className="text-kultiva-charcoal/70 text-sm leading-relaxed">
                    {t(`values.${value.key}.description`)}
                  </p>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="kultiva-section kultiva-section-gray">
        <div className="kultiva-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedElement animation="fade-right">
              <div className="relative">
                <img
                  src="/kultiva/images/founder.jpg"
                  alt="Iskya Boom"
                  className="rounded-3xl shadow-xl w-full"
                />
                <div className="absolute -bottom-6 -right-6 bg-kultiva-secondary text-white rounded-2xl p-6 shadow-xl">
                  <div className="text-2xl font-bold">CEO</div>
                  <div className="text-sm text-white/80">& Fundadora</div>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement animation="fade-left" delay={200}>
              <span className="kultiva-subtitle">{t("founder.subtitle")}</span>
              <h2 className="kultiva-title">{t("founder.title")}</h2>
              <p className="text-lg text-kultiva-charcoal/70 mb-4">
                {t("founder.role")}
              </p>
              <blockquote className="text-xl italic text-kultiva-charcoal leading-relaxed mb-6 pl-4 border-l-4 border-kultiva-primary">
                "{t("founder.description")}"
              </blockquote>
              <p className="kultiva-lead">{t("founder.bio")}</p>
            </AnimatedElement>
          </div>
        </div>
      </section>
    </>
  );
}
