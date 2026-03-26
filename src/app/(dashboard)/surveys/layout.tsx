import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { SurveysNav } from "@/components/surveys/surveys-nav";

export default async function SurveysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.companyUser?.role !== "ADMIN") {
    redirect("/overview");
  }

  return (
    <div className="flex gap-8">
      <SurveysNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
