"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/domain/enums";

interface CourseAttendance {
  course: { id: string; code: string; title: string };
  dates: string[];
  rows: Array<{
    enrollmentId: string;
    student: { id: string; studentId: string; firstName: string; lastName: string };
    tally: { percentage: number; present: number; absent: number; late: number; excused: number; total: number };
    records: Record<string, string>;
  }>;
  courseTally: { percentage: number; total: number };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Attendance matrix with idempotent daily marking, shared across roles. */
export function AttendanceRecorder({ courseId }: { courseId: string }) {
  const toast = useToast();
  const [data, setData] = useState<CourseAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get<CourseAttendance>(`/api/courses/${courseId}/attendance`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load attendance"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Preselect each student's existing status for the chosen date, else PRESENT.
  useEffect(() => {
    if (!data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const row of data.rows) {
      const existingKey = Object.keys(row.records).find((key) => key.startsWith(date));
      next[row.enrollmentId] = existingKey
        ? (row.records[existingKey] as AttendanceStatus)
        : "PRESENT";
    }
    setStatuses(next);
  }, [data, date]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const result = await api.put<{ marked: number }>("/api/attendance", {
        courseId,
        date,
        records: Object.entries(statuses).map(([enrollmentId, status]) => ({ enrollmentId, status })),
      });
      toast.success(`Attendance saved for ${result.marked} student(s)`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={4} />
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

  return (
    <>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="attendance-date" className="text-xs font-medium">
              Session date
            </label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              max={today()}
              onChange={(event) => setDate(event.target.value)}
              className="h-9 w-44"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Overall: <strong className="tabular-nums">{data.courseTally.percentage}%</strong> across{" "}
              {data.courseTally.total} records
            </span>
            <Button onClick={handleSave} loading={saving}>
              Save attendance
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {data.course.code} — {data.course.title}
          </CardTitle>
        </CardHeader>
        {data.rows.length === 0 ? (
          <EmptyState title="No enrolled students" description="Enrol students to begin recording attendance." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Student ID</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Attendance</TableHeaderCell>
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
                    <Select
                      value={statuses[row.enrollmentId] ?? "PRESENT"}
                      aria-label={`Attendance status for ${row.student.firstName} ${row.student.lastName}`}
                      className="h-9 w-36"
                      onChange={(event) =>
                        setStatuses((current) => ({
                          ...current,
                          [row.enrollmentId]: event.target.value as AttendanceStatus,
                        }))
                      }
                    >
                      {ATTENDANCE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={
                        row.tally.percentage >= 75 ? "success" : row.tally.percentage >= 50 ? "warning" : "destructive"
                      }
                    >
                      {row.tally.percentage}%
                    </Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {row.tally.present}P · {row.tally.late}L · {row.tally.absent}A · {row.tally.excused}E
                    </span>
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
