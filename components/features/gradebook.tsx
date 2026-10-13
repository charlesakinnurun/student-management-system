"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";

interface Gradebook {
  course: { id: string; code: string; title: string; creditUnits: number };
  assessments: Array<{ id: string; title: string; type: string; maxScore: number; weight: number; isPublished: boolean }>;
  rows: Array<{
    enrollmentId: string;
    student: { id: string; studentId: string; firstName: string; lastName: string };
    scores: Record<string, number>;
    total: number;
    gradedWeight: number;
    isComplete: boolean;
    grade: string | null;
    points: number | null;
  }>;
  weightSum: number;
}

/** Computed gradebook for a course — totals and letter grades from configured bands. */
export function Gradebook({ courseId }: { courseId: string }) {
  const [data, setData] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<Gradebook>(`/api/courses/${courseId}/gradebook`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load gradebook"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={5} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }
  if (!data) return null;

  const weightsComplete = Math.abs(data.weightSum - 100) < 0.01;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Gradebook — {data.course.code} ({data.course.creditUnits} credits)
        </CardTitle>
        {!weightsComplete ? (
          <p className="text-xs text-warning-foreground">
            Assessment weights total {data.weightSum}% (should be 100%). Totals are still computed as configured.
          </p>
        ) : null}
      </CardHeader>
      {data.rows.length === 0 ? (
        <EmptyState title="No students enrolled" />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Student</TableHeaderCell>
              {data.assessments.map((assessment) => (
                <TableHeaderCell key={assessment.id} className="text-right">
                  {assessment.title}
                  <span className="block font-normal normal-case text-muted-foreground">
                    /{assessment.maxScore} · {assessment.weight}%
                  </span>
                </TableHeaderCell>
              ))}
              <TableHeaderCell className="text-right">Total</TableHeaderCell>
              <TableHeaderCell>Grade</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.enrollmentId}>
                <TableCell>
                  <span className="font-medium">
                    {row.student.firstName} {row.student.lastName}
                  </span>
                  <p className="font-mono text-[11px] text-muted-foreground">{row.student.studentId}</p>
                </TableCell>
                {data.assessments.map((assessment) => (
                  <TableCell key={assessment.id} className="text-right tabular-nums">
                    {row.scores[assessment.id] ?? "—"}
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums">
                  <span className="font-medium">{row.total}%</span>
                  <span className="block text-[11px] text-muted-foreground">{row.gradedWeight}% graded</span>
                </TableCell>
                <TableCell>
                  {row.grade ? (
                    <Badge tone={statusTone(row.grade === "F" ? "OVERDUE" : "COMPLETED")}>
                      {row.grade} ({row.points})
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
