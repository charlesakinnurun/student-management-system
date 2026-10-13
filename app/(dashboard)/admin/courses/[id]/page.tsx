import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseById } from "@/lib/services/course.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Gradebook } from "@/components/features/gradebook";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Course" };

export default async function AdminCourseDetailPage({ params }: { params: { id: string } }) {
  let course: Awaited<ReturnType<typeof getCourseById>>;
  try {
    course = await getCourseById(params.id);
  } catch {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`${course.code} — ${course.title}`}
        description={`${course.department.name} · ${course.creditUnits} credit units · Level ${course.level ?? "—"}`}
        actions={
          <Link href="/admin/courses" className="text-sm text-primary underline underline-offset-4">
            Back to courses
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Days:</span> {course.scheduleDays ?? "—"}</p>
            <p>
              <span className="text-muted-foreground">Time:</span>{" "}
              {course.startTime ? `${course.startTime} – ${course.endTime ?? ""}` : "—"}
            </p>
            <p><span className="text-muted-foreground">Venue:</span> {course.venue ?? "—"}</p>
            <p><span className="text-muted-foreground">Semester:</span> {course.semester?.name ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lecturer assignments</CardTitle>
          </CardHeader>
          {course.assignments.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">No lecturer assigned yet.</CardContent>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Lecturer</TableHeaderCell>
                  <TableHeaderCell>Staff ID</TableHeaderCell>
                  <TableHeaderCell>Session</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {course.assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {assignment.staff.firstName} {assignment.staff.lastName}
                      <p className="text-xs text-muted-foreground">{assignment.staff.user.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{assignment.staff.staffId}</TableCell>
                    <TableCell>{assignment.session.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Assessments</CardTitle>
        </CardHeader>
        {course.assessments.length === 0 ? (
          <CardContent className="text-sm text-muted-foreground">No assessments created yet.</CardContent>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Max</TableHeaderCell>
                <TableHeaderCell>Weight</TableHeaderCell>
                <TableHeaderCell>Due</TableHeaderCell>
                <TableHeaderCell>Scores</TableHeaderCell>
                <TableHeaderCell>Published</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {course.assessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell>
                    <Link href={`/admin/assessments/${assessment.id}`} className="font-medium text-primary hover:underline">
                      {assessment.title}
                    </Link>
                  </TableCell>
                  <TableCell><Badge>{assessment.type}</Badge></TableCell>
                  <TableCell>{assessment.maxScore}</TableCell>
                  <TableCell>{assessment.weight}%</TableCell>
                  <TableCell>{formatDate(assessment.dueDate)}</TableCell>
                  <TableCell>{assessment._count.scores}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone(assessment.isPublished ? "PUBLISHED" : "PENDING")}>
                      {assessment.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="mt-4">
        <Gradebook courseId={course.id} />
      </div>
    </>
  );
}
