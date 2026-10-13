import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentResults } from "@/lib/services/score.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Results" };

export default async function StudentGradesPage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const { terms, results } = await getStudentResults(session.studentProfileId);
  const gradedTerms = terms.filter((term) => term.gpa !== null);
  const cgpa =
    gradedTerms.length > 0
      ? Math.round(
          (gradedTerms.reduce((sum, term) => sum + (term.gpa ?? 0) * term.totalCredits, 0) /
            gradedTerms.reduce((sum, term) => sum + term.totalCredits, 0)) *
            100,
        ) / 100
      : null;

  return (
    <>
      <PageHeader
        title="Results"
        description="Only results published by your lecturers are shown. Provisional totals include unpublished assessments."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="CGPA" value={cgpa ?? "—"} />
        <StatCard label="Courses" value={results.length} />
        <StatCard label="Terms with results" value={gradedTerms.length} />
      </div>

      {terms.length === 0 ? (
        <Card className="mt-4">
          <EmptyState title="No results yet" description="Results will appear here once lecturers publish them." />
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {terms.map((term) => (
            <Card key={`${term.session.id}-${term.semester.id}`}>
              <CardHeader>
                <CardTitle>
                  {term.session.name} · {term.semester.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  GPA: {term.gpa ?? "—"} · {term.totalCredits} graded credits
                </p>
              </CardHeader>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Course</TableHeaderCell>
                    <TableHeaderCell>Credits</TableHeaderCell>
                    <TableHeaderCell>Total</TableHeaderCell>
                    <TableHeaderCell>Grade</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {term.results.map((result) => (
                    <TableRow key={result.enrollmentId}>
                      <TableCell>
                        <span className="font-medium">{result.course.code}</span>
                        <p className="text-xs text-muted-foreground">{result.course.title}</p>
                      </TableCell>
                      <TableCell>{result.course.creditUnits}</TableCell>
                      <TableCell className="tabular-nums">
                        {result.total}%
                        <span className="block text-[11px] text-muted-foreground">
                          {result.gradedWeight}% graded
                        </span>
                      </TableCell>
                      <TableCell>
                        {result.published && result.grade ? (
                          <Badge tone={result.grade === "F" ? "destructive" : "success"}>
                            {result.grade} ({result.points})
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Not published</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge tone={result.published ? "success" : "warning"}>
                          {result.published ? "Published" : "Provisional"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
