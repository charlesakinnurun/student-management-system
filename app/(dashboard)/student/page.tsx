import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentDashboard } from "@/lib/services/dashboard.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Student dashboard" };

export default async function StudentDashboardPage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const data = await getStudentDashboard(session.studentProfileId);

  return (
    <>
      <PageHeader
        title={`Welcome, ${data.profile?.firstName ?? session.name}`}
        description={
          data.currentSemester
            ? `${data.currentSemester.name} · ${data.currentSemester.session.name}`
            : "No current semester set"
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Student ID" value={data.profile?.studentId ?? "—"} />
        <StatCard label="Registered courses" value={data.courses.length} />
        <StatCard label="GPA (latest term)" value={data.gpa ?? "—"} hint={`${data.totalCredits} credits`} />
        <StatCard label="Attendance" value={`${data.attendance.overall.percentage}%`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registered courses</CardTitle>
          </CardHeader>
          {data.courses.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">You are not registered for any courses yet.</CardContent>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Course</TableHeaderCell>
                  <TableHeaderCell>Credits</TableHeaderCell>
                  <TableHeaderCell>Term</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <span className="font-medium">{course.code}</span>
                      <p className="text-xs text-muted-foreground">{course.title}</p>
                    </TableCell>
                    <TableCell>{course.creditUnits}</TableCell>
                    <TableCell>{course.term}</TableCell>
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
            <CardContent className="text-sm text-muted-foreground">Nothing due right now.</CardContent>
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
                      <span className="font-medium">{assessment.title}</span>
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
            <CardTitle>Recent grades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentGrades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published results yet.</p>
            ) : (
              data.recentGrades.map((score) => (
                <div key={score.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{score.assessment.title}</p>
                    <p className="text-xs text-muted-foreground">{score.assessment.course.code}</p>
                  </div>
                  <span className="tabular-nums text-sm">
                    {score.rawScore}/{score.assessment.maxScore}
                  </span>
                </div>
              ))
            )}
            <Link href="/student/grades" className="inline-block text-sm text-primary underline underline-offset-4">
              View all results
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            ) : (
              data.announcements.map((announcement) => (
                <div key={announcement.id} className="border-b pb-2 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{announcement.body}</p>
                  <Badge tone={statusTone("ACTIVE")} className="mt-1">
                    {formatDate(announcement.publishedAt)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
