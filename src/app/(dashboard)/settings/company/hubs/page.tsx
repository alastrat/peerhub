import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { HubsManager } from "@/components/settings/hubs-manager";
import { TranslatedPageHeader } from "@/components/dashboard/translated-page-header";

export default async function HubsSettingsPage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyUser.companyId },
    select: { featureHubs: true },
  });

  // Redirect if featureHubs is not enabled
  if (!company?.featureHubs) {
    redirect("/settings/company");
  }

  const hubs = await prisma.hub.findMany({
    where: { companyId: session.companyUser.companyId },
    include: { _count: { select: { employees: true, teams: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <TranslatedPageHeader
        titleKey="hubs_title"
        descriptionKey="hubs_description"
      />
      <HubsManager hubs={hubs} />
    </div>
  );
}
