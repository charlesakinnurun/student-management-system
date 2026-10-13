import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLecturerDashboard } from "@/lib/services/dashboard.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Lecturer dashboard" };

export default async function LecturerDashboardPage() {
  const session = await getSession();
  if (!session?.staffProfileId) redirect("/login");

  const data = await getLecturerDashboard(session.staffProfileId);

  return (
    <>
      <PageHeader title="Dashboard" description="Your courses, assessments and student performance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Courses" value={data.totals.courses} />
        <StatCard label="Students" value={data.totals.students} />
        <StatCard
          label="Attendance"
          value={`${data.attendance.percentage}%`}
          hint={`${data.attendance.total} records`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My courses</CardTitle>
          </CardHeader>
          {data.courses.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">
              You have no assigned courses for the current session.
            </CardContent>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Course</TableHeaderCell>
                  <TableHeaderCell>Students</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Link href={`/lecturer/courses/${course.id}`} className="font-medium text-primary hover:underline">
                        {course.code}
                      </Link>
                      <p className="text-xs text-muted-foreground">{course.title}</p>
                    </TableCell>
                    <TableCell>{course._count.enrollments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming assessments</CardTitle>
          </CardHeader>
          {data.upcomingAssessments.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">No upcoming assessments.</CardContent>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Assessment</TableHeaderCell>
                  <TableHeaderCell>Course</TableHeaderCell>
                  <TableHeaderCell>Due</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.upcomingAssessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <Link href={`/lecturer/assessments/${assessment.id}`} className="font-medium text-primary hover:underline">
                        {assessment.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{assessment.type}</p>
                    </TableCell>
                    <TableCell>{assessment.course.code}</TableCell>
                    <TableCell>{formatDate(assessment.dueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.performance.perCourse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No performance data yet.</p>
            ) : (
              data.performance.perCourse.map((row) => (
                <div key={row.course.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{row.course.code}</p>
                    <p className="text-xs text-muted-foreground">{row.students} students</p>
                  </div>
                  <Badge tone={(row.average ?? 0) >= 50 ? "success" : "warning"}>
                    {row.average === null ? "—" : `${row.average}%`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent score entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentGrades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scores entered yet.</p>
            ) : (
              data.recentGrades.map((score) => (
                <div key={score.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">
                      {score.enrollment.student.firstName} {score.enrollment.student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {score.assessment.course.code} · {score.assessment.title}
                    </p>
                  </div>
                  <span className="tabular-nums text-sm">
                    {score.rawScore}/{score.assessment.maxScore}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
