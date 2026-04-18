import { getTranslations } from "next-intl/server";
import { ModuleDetailSection } from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "modulos.gestionPersonas.metadata" });
  return { title: t("title"), description: t("description") };
}

export default function PeopleModulePage() {
  return (
    <ModuleDetailSection
      namespace="modulos.gestionPersonas"
      accentColor="#22c55e"
      icon="fa-users-gear"
      screenshot="/images/screenshots/people-directory.png"
      capabilityKeys={["directory", "csv", "hierarchy", "profiles", "roles", "deactivation"]}
      stepKeys={["import", "verify", "assign", "manage", "audit"]}
      faqKeys={["q1", "q2", "q3", "q4", "q5"]}
      crossLinks={[
        { slug: "/modulos/feedback-360", key: "feedback360" },
        { slug: "/modulos/estructura-organizacional", key: "org" },
      ]}
    />
  );
}
