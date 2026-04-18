import { getTranslations } from "next-intl/server";
import { ModuleDetailSection } from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "modulos.encuestasClima.metadata" });
  return { title: t("title"), description: t("description") };
}

export default function ClimateModulePage() {
  return (
    <ModuleDetailSection
      namespace="modulos.encuestasClima"
      accentColor="#ec4899"
      icon="fa-heart-pulse"
      screenshot="/images/screenshots/climate-results.png"
      capabilityKeys={["types", "templates", "dimensions", "scope", "anonymity", "trends"]}
      stepKeys={["create", "configure", "distribute", "monitor", "analyze"]}
      faqKeys={["q1", "q2", "q3", "q4", "q5"]}
      crossLinks={[
        { slug: "/modulos/feedback-360", key: "feedback360" },
        { slug: "/modulos/gestion-personas", key: "people" },
      ]}
    />
  );
}
