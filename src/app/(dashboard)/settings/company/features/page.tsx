import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { FeaturesManager } from "@/components/settings/features-manager";

export default async function FeaturesPage() {
  const session = await auth();
  if (session?.user?.globalRole !== "SUPER_ADMIN") redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      featureAts: true,
      featureOnboarding: true,
      featureWorkEnv: true,
    },
  });

  if (!company) redirect("/settings/profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Features"
        description="Enable or disable modules for this company"
      />
      <FeaturesManager
        companyId={company.id}
        features={{
          ats: company.featureAts,
          onboarding: company.featureOnboarding,
          workEnv: company.featureWorkEnv,
        }}
      />
    </div>
  );
}
