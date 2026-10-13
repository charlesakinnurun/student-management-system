import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertLecturerOwnsCourse } from "@/lib/services/access";
import { getCourseById } from "@/lib/services/course.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Gradebook } from "@/components/features/gradebook";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Course" };

export default async function LecturerCoursePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.staffProfileId) redirect("/login");

  // Server-side ownership check: a lecturer may only open their own courses.
  try {
    await assertLecturerOwnsCourse(session.staffProfileId, params.id);
  } catch {
    notFound();
  }

  let course: Awaited<ReturnType<typeof getCourseById>>;
  try {
    course = await getCourseById(params.id);
  } catch {
    notFound();
  }

  const rosterSize = course._count.enrollments;

  return (
    <>
      <PageHeader
        title={`${course.code} — ${course.title}`}
        description={`${rosterSize} student(s) · ${course.creditUnits} credit units`}
        actions={
          <Link href="/lecturer/courses" className="text-sm text-primary underline underline-offset-4">
            Back to my courses
          </Link>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Assessments</CardTitle>
        </CardHeader>
        {course.assessments.length === 0 ? (
          <CardContent className="text-sm text-muted-foreground">No assessments for this course yet.</CardContent>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Max</TableHeaderCell>
                <TableHeaderCell>Weight</TableHeaderCell>
                <TableHeaderCell>Due</TableHeaderCell>
                <TableHeaderCell>Published</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {course.assessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell>
                    <Link href={`/lecturer/assessments/${assessment.id}`} className="font-medium text-primary hover:underline">
                      {assessment.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{assessment._count.scores} score(s) entered</p>
                  </TableCell>
                  <TableCell><Badge>{assessment.type}</Badge></TableCell>
                  <TableCell>{assessment.maxScore}</TableCell>
                  <TableCell>{assessment.weight}%</TableCell>
                  <TableCell>{formatDate(assessment.dueDate)}</TableCell>
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

      <Gradebook courseId={course.id} />
    </>
  );
}
