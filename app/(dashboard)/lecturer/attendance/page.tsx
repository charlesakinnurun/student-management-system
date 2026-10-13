"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { AttendanceRecorder } from "@/components/features/attendance-recorder";
import { useOptions } from "@/lib/hooks/use-options";

export default function LecturerAttendancePage() {
  const courses = useOptions<{ id: string; code: string; title: string }>("/api/courses", (c) => ({
    label: `${c.code} — ${c.title}`,
    value: c.id,
  }));
  const [courseId, setCourseId] = useState("");

  return (
    <>
      <PageHeader title="Attendance" description="Record attendance for the courses you teach." />

      <Card className="mb-4">
        <CardContent className="py-4">
          <label htmlFor="course" className="text-xs font-medium">
            Course
          </label>
          <Select
            id="course"
            value={courseId}
            className="mt-1 h-9 max-w-md"
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Select a course…</option>
            {courses.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {courseId ? (
        <AttendanceRecorder courseId={courseId} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Select one of your courses to begin.
          </CardContent>
        </Card>
      )}
    </>
  );
}
