import { getTranslations } from "next-intl/server";
import { PageHero } from "@/components/kultiva/layout";
import { ContactForm } from "@/components/kultiva/sections";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("hero.title"),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <>
      <PageHero title={t("hero.title")} breadcrumb={t("hero.breadcrumb")} />
      <ContactForm />

      {/* Map */}
      <section className="h-96 bg-kultiva-sand">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125221.51098779548!2d-74.87478169999999!3d10.96389565!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42d4ec6d0a8ef%3A0x1fbb1b0ccbb57d31!2sBarranquilla%2C%20Atlantico%2C%20Colombia!5e0!3m2!1sen!2sus!4v1640000000000!5m2!1sen!2sus"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicacion de Kultiva en Barranquilla"
        />
      </section>
    </>
  );
}
