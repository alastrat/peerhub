import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getSurveyResults } from "@/lib/queries/climate-reports";
import { getNPSCategory, NPS_CATEGORIES } from "@/lib/constants/climate-survey";

interface PageProps {
  params: Promise<{ id: string }>;
}

function NPSGauge({ score }: { score: number }) {
  const color = score >= 50 ? "text-green-600" : score >= 0 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="text-center">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <p className="mt-1 text-sm text-muted-foreground">eNPS Score</p>
    </div>
  );
}

function DimensionBar({ name, average, maxScore }: { name: string; average: number; maxScore: number }) {
  const percent = (average / maxScore) * 100;
  const color = percent >= 80 ? "bg-green-500" : percent >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">{average.toFixed(2)} / {maxScore}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function HeatmapCell({ value, maxScore }: { value: number; maxScore: number }) {
  const percent = (value / maxScore) * 100;
  const bg =
    percent >= 80
      ? "bg-green-100 text-green-800"
      : percent >= 60
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <td className={`px-3 py-2 text-center text-sm font-medium ${bg}`}>
      {value.toFixed(1)}
    </td>
  );
}

export default async function SurveyResultsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.companyUser || session.companyUser.role !== "ADMIN") {
    redirect("/overview");
  }

  const results = await getSurveyResults(id, session.companyUser.companyId);
  if (!results) notFound();

  // Determine max score based on question types
  const hasNPS = results.questionResults.some((q) => q.type === "NPS");
  const maxScore = hasNPS ? 10 : 5;

  // Build heatmap data
  const departments = [...new Set(results.departmentBreakdown.map((d) => d.departmentId))];
  const dimensions = [...new Set(results.departmentBreakdown.map((d) => d.dimensionId))];
  const deptNames = new Map(results.departmentBreakdown.map((d) => [d.departmentId, d.departmentName]));
  const dimNames = new Map(results.departmentBreakdown.map((d) => [d.dimensionId, d.dimensionName]));
  const heatmapLookup = new Map(
    results.departmentBreakdown.map((d) => [`${d.departmentId}-${d.dimensionId}`, d.average])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/climate/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`Results: ${results.surveyName}`}
          description="Survey results and analytics"
        />
      </div>

      {/* Participation Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{results.totalInvited}</div>
            <p className="text-sm text-muted-foreground">Invited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{results.totalResponded}</div>
            <p className="text-sm text-muted-foreground">Responded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{results.completionRate}%</div>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {results.npsScore != null ? (
              <NPSGauge score={results.npsScore} />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {results.overallAverage != null ? results.overallAverage.toFixed(2) : "—"}
                </div>
                <p className="text-sm text-muted-foreground">Overall Average</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NPS Breakdown */}
      {results.npsScore != null && (
        <Card>
          <CardHeader>
            <CardTitle>eNPS Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const npsResults = results.questionResults.filter((q) => q.type === "NPS");
              const allRatings = npsResults.flatMap((q) =>
                Object.entries(q.distribution).flatMap(([rating, count]) =>
                  Array(count).fill(Number(rating))
                )
              );
              const total = allRatings.length;
              if (total === 0) return <p className="text-muted-foreground">No responses yet</p>;
              const promoters = allRatings.filter((r) => r >= 9).length;
              const passives = allRatings.filter((r) => r >= 7 && r <= 8).length;
              const detractors = allRatings.filter((r) => r <= 6).length;

              return (
                <div className="space-y-3">
                  <div className="flex h-6 w-full overflow-hidden rounded-full">
                    <div className="bg-red-400" style={{ width: `${(detractors / total) * 100}%` }} />
                    <div className="bg-yellow-400" style={{ width: `${(passives / total) * 100}%` }} />
                    <div className="bg-green-400" style={{ width: `${(promoters / total) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Detractors: {Math.round((detractors / total) * 100)}%</span>
                    <span className="text-yellow-600">Passives: {Math.round((passives / total) * 100)}%</span>
                    <span className="text-green-600">Promoters: {Math.round((promoters / total) * 100)}%</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Dimension Scores */}
      {results.dimensionScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scores by Dimension</CardTitle>
            <CardDescription>Average scores across all responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.dimensionScores
              .sort((a, b) => b.average - a.average)
              .map((dim) => (
                <DimensionBar
                  key={dim.dimensionId}
                  name={dim.dimensionName}
                  average={dim.average}
                  maxScore={maxScore}
                />
              ))}
          </CardContent>
        </Card>
      )}

      {/* Department x Dimension Heatmap */}
      {departments.length > 0 && dimensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Heatmap</CardTitle>
            <CardDescription>Average scores by department and dimension</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Department</th>
                  {dimensions.map((dimId) => (
                    <th key={dimId} className="text-center px-3 py-2 font-medium">
                      {dimNames.get(dimId)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map((deptId) => (
                  <tr key={deptId} className="border-t">
                    <td className="px-3 py-2 font-medium">{deptNames.get(deptId)}</td>
                    {dimensions.map((dimId) => {
                      const value = heatmapLookup.get(`${deptId}-${dimId}`);
                      return value != null ? (
                        <HeatmapCell key={dimId} value={value} maxScore={maxScore} />
                      ) : (
                        <td key={dimId} className="px-3 py-2 text-center text-muted-foreground">—</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Question-level Results */}
      <Card>
        <CardHeader>
          <CardTitle>Question Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.questionResults.map((q, i) => (
            <div key={q.questionId} className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{i + 1}.</span>
                  <div>
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{q.type}</Badge>
                      {q.dimensionName && (
                        <Badge variant="secondary" className="text-xs">{q.dimensionName}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {q.average != null && (
                  <span className="text-lg font-bold">{q.average.toFixed(2)}</span>
                )}
              </div>
              {q.count > 0 && (
                <div className="ml-9">
                  <p className="text-xs text-muted-foreground">{q.count} responses</p>
                </div>
              )}
              {q.textResponses.length > 0 && (
                <div className="ml-9 space-y-1">
                  {q.textResponses.slice(0, 5).map((text, j) => (
                    <p key={j} className="text-sm text-muted-foreground border-l-2 pl-3">
                      {text}
                    </p>
                  ))}
                  {q.textResponses.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{q.textResponses.length - 5} more responses
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
