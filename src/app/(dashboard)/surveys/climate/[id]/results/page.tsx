import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Results live in the survey's "Análisis" tab; keep old links working.
export default async function SurveyResultsPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/surveys/climate/${id}`);
}
