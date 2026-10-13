import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listStudentEnrollments } from "@/lib/services/enrollment.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My courses" };

export default async function StudentCoursesPage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const enrollments = await listStudentEnrollments(session.studentProfileId);

  return (
    <>
      <PageHeader title="My courses" description="Courses you are registered for." />
      <Card>
        {enrollments.length === 0 ? (
          <EmptyState title="No registered courses" description="Contact your department to be enrolled." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Course</TableHeaderCell>
                <TableHeaderCell>Session</TableHeaderCell>
                <TableHeaderCell>Semester</TableHeaderCell>
                <TableHeaderCell>Credits</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Enrolled</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <span className="font-medium">{enrollment.course.code}</span>
                    <p className="text-xs text-muted-foreground">{enrollment.course.title}</p>
                  </TableCell>
                  <TableCell>{enrollment.session.name}</TableCell>
                  <TableCell>{enrollment.semester.name}</TableCell>
                  <TableCell>{enrollment.course.creditUnits}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone(enrollment.status)}>{enrollment.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(enrollment.enrolledAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
