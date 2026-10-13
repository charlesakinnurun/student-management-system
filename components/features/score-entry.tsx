"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

interface AssessmentScores {
  assessment: {
    id: string;
    title: string;
    type: string;
    maxScore: number;
    weight: number;
    isPublished: boolean;
    course: { id: string; code: string; title: string };
  };
  rows: Array<{
    enrollmentId: string;
    student: { id: string; studentId: string; firstName: string; lastName: string };
    scoreId: string | null;
    rawScore: number | null;
  }>;
}

/** Reusable score-entry grid shared by admin and lecturer areas. */
export function ScoreEntry({ assessmentId, backHref }: { assessmentId: string; backHref: string }) {
  const toast = useToast();
  const [data, setData] = useState<AssessmentScores | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<AssessmentScores>(`/api/assessments/${assessmentId}/scores`)
      .then((result) => {
        setData(result);
        setValues(
          Object.fromEntries(
            result.rows.map((row) => [row.enrollmentId, row.rawScore === null ? "" : String(row.rawScore)]),
          ),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load scores"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const maxScore = data?.assessment.maxScore ?? 0;

  function invalidEntries(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [enrollmentId, value] of Object.entries(values)) {
      if (value === "") continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > maxScore) {
        errors[enrollmentId] = `0–${maxScore}`;
      }
    }
    return errors;
  }

  async function handleSave() {
    const errors = invalidEntries();
    if (Object.keys(errors).length > 0) {
      toast.error(`Some scores are invalid. Allowed range is 0–${maxScore}.`);
      return;
    }
    const scores = Object.entries(values)
      .filter(([, value]) => value !== "")
      .map(([enrollmentId, value]) => ({ enrollmentId, rawScore: Number(value) }));

    if (scores.length === 0) {
      toast.error("Enter at least one score before saving.");
      return;
    }

    setSaving(true);
    try {
      const result = await api.post<{ saved: number; skipped: Array<{ reason: string }> }>(
        "/api/scores/bulk",
        { assessmentId, scores },
      );
      toast.success(`${result.saved} score(s) saved${result.skipped.length ? `, ${result.skipped.length} skipped` : ""}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save scores");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!data) return;
    setPublishing(true);
    try {
      await api.patch(`/api/assessments/${assessmentId}/publish`, { isPublished: !data.assessment.isPublished });
      toast.success(data.assessment.isPublished ? "Results unpublished" : "Results published to students");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update publication");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={3} />
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

  const errors = invalidEntries();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{data.assessment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {data.assessment.course.code} — {data.assessment.course.title} · max {maxScore} · weight{" "}
            {data.assessment.weight}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={data.assessment.isPublished ? "success" : "warning"}>
            {data.assessment.isPublished ? "Published" : "Draft"}
          </Badge>
          <Button variant="outline" size="sm" onClick={togglePublish} loading={publishing}>
            {data.assessment.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save scores
          </Button>
        </div>
      </div>

      <Link href={backHref} className="mb-4 inline-block text-sm text-primary underline underline-offset-4">
        ← Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Student scores</CardTitle>
        </CardHeader>
        {data.rows.length === 0 ? (
          <EmptyState title="No enrolled students" description="Students must be enrolled before scores can be entered." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Student ID</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Score (0–{maxScore})</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.enrollmentId}>
                  <TableCell className="font-mono text-xs">{row.student.studentId}</TableCell>
                  <TableCell>
                    {row.student.firstName} {row.student.lastName}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={maxScore}
                      step="0.01"
                      value={values[row.enrollmentId] ?? ""}
                      aria-invalid={Boolean(errors[row.enrollmentId])}
                      aria-label={`Score for ${row.student.firstName} ${row.student.lastName}`}
                      className="h-9 w-28"
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [row.enrollmentId]: event.target.value }))
                      }
                    />
                    {errors[row.enrollmentId] ? (
                      <p className="mt-1 text-xs text-destructive">{errors[row.enrollmentId]}</p>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
