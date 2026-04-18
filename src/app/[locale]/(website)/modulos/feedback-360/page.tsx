import { getTranslations } from "next-intl/server";
import { ModuleDetailSection } from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "modulos.feedback360.metadata" });
  return { title: t("title"), description: t("description") };
}

export default function FeedbackModulePage() {
  return (
    <ModuleDetailSection
      namespace="modulos.feedback360"
      accentColor="#8b5cf6"
      icon="fa-people-arrows"
      screenshot="/images/screenshots/360-cycle-detail.png"
      capabilityKeys={["evaluators", "competencies", "anonymity", "nominations", "release", "reports"]}
      stepKeys={["create", "nominate", "evaluate", "review", "release"]}
      faqKeys={["q1", "q2", "q3", "q4", "q5"]}
      crossLinks={[
        { slug: "/modulos/encuestas-clima", key: "climate" },
        { slug: "/modulos/gestion-personas", key: "people" },
      ]}
    />
  );
}
