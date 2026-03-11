import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { CompetenciesManager } from "@/components/settings/competencies-manager";

export default async function CompetenciesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin = isSuperAdmin || session.companyUser?.role === "ADMIN";
  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const competencies = await prisma.competency.findMany({
    where: { companyId },
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competencies"
        description="Define organizational competencies for use in review templates"
      />
      <CompetenciesManager
        competencies={competencies.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          category: c.category,
          questionsCount: c._count.questions,
        }))}
      />
    </div>
  );
}
