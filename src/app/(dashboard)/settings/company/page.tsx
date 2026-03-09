import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/design-system/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CompanySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const isCompanyAdmin =
    isSuperAdmin || session.companyUser?.role === "ADMIN";

  if (!isCompanyAdmin) redirect("/settings/profile");

  const companyId = session.companyUser?.companyId;
  if (!companyId) redirect("/settings/profile");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: { users: true, cycles: true, departments: true },
      },
      departments: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!company) redirect("/settings/profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description={`Manage settings for ${company.name}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{company.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slug</p>
              <Badge variant="secondary" className="font-mono">
                {company.slug}
              </Badge>
            </div>
            {company.domain && (
              <div>
                <p className="text-sm text-muted-foreground">Domain</p>
                <p className="text-sm">{company.domain}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="font-medium">{company._count.users}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Departments</span>
              <span className="font-medium">{company._count.departments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Review Cycles
              </span>
              <span className="font-medium">{company._count.cycles}</span>
            </div>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {company.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No departments created yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {company.departments.map((d) => (
                  <Badge key={d.id} variant="outline">
                    {d.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
