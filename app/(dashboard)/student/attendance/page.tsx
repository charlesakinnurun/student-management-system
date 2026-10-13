import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentAttendance } from "@/lib/services/attendance.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Attendance" };

export default async function StudentAttendancePage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const { courses, overall } = await getStudentAttendance(session.studentProfileId);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Excused absences are excluded from your attendance percentage."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Overall" value={`${overall.percentage}%`} hint={`${overall.total} records`} />
        <StatCard label="Present" value={overall.present} />
        <StatCard label="Late" value={overall.late} />
        <StatCard label="Absent" value={overall.absent} hint={`${overall.excused} excused`} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>By course</CardTitle>
        </CardHeader>
        {courses.length === 0 ? (
          <EmptyState title="No attendance records" description="Attendance appears once your lecturers record it." />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Course</TableHeaderCell>
                <TableHeaderCell>Present</TableHeaderCell>
                <TableHeaderCell>Late</TableHeaderCell>
                <TableHeaderCell>Absent</TableHeaderCell>
                <TableHeaderCell>Excused</TableHeaderCell>
                <TableHeaderCell>Percentage</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((row) => (
                <TableRow key={row.course.id}>
                  <TableCell>
                    <span className="font-medium">{row.course.code}</span>
                    <p className="text-xs text-muted-foreground">{row.course.title}</p>
                  </TableCell>
                  <TableCell>{row.tally.present}</TableCell>
                  <TableCell>{row.tally.late}</TableCell>
                  <TableCell>{row.tally.absent}</TableCell>
                  <TableCell>{row.tally.excused}</TableCell>
                  <TableCell>
                    <Badge
                      tone={row.tally.percentage >= 75 ? "success" : row.tally.percentage >= 50 ? "warning" : "destructive"}
                    >
                      {row.tally.percentage}%
                    </Badge>
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
