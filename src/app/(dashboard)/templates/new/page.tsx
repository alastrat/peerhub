import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { TemplateBuilder } from "@/components/templates/template-builder";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Template"
        description="Build a new review template with sections and questions"
      />

      <TemplateBuilder mode="create" />
    </div>
  );
}
