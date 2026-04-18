import { getTranslations } from "next-intl/server";
import { ModuleDetailSection } from "@/components/bizzen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "modulos.estructuraOrganizacional.metadata" });
  return { title: t("title"), description: t("description") };
}

export default function OrgModulePage() {
  return (
    <ModuleDetailSection
      namespace="modulos.estructuraOrganizacional"
      accentColor="#f59e0b"
      icon="fa-sitemap"
      screenshot="/images/screenshots/org-departments.png"
      capabilityKeys={["hubs", "departments", "teams", "scoping", "permissions", "reporting"]}
      stepKeys={["model", "assign", "validate", "scope", "report"]}
      faqKeys={["q1", "q2", "q3", "q4", "q5"]}
      crossLinks={[
        { slug: "/modulos/feedback-360", key: "feedback360" },
        { slug: "/modulos/encuestas-clima", key: "climate" },
      ]}
    />
  );
}
