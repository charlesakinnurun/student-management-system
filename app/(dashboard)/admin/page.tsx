import Link from "next/link";
import { getAdminDashboard } from "@/lib/services/dashboard.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/ui/icon";
import { formatCompact, formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Admin dashboard" };

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          data.currentSession
            ? `Current session: ${data.currentSession.name}${data.currentSemester ? ` · ${data.currentSemester.name}` : ""}`
            : "No current academic session has been set"
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={formatCompact(data.totals.students)} icon={<Icon name="students" />} />
        <StatCard label="Staff" value={formatCompact(data.totals.staff)} icon={<Icon name="staff" />} />
        <StatCard
          label="Departments"
          value={data.totals.departments}
          hint={`${data.totals.faculties} faculties`}
          icon={<Icon name="building" />}
        />
        <StatCard label="Courses" value={data.totals.courses} icon={<Icon name="book" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums">{data.attendance.percentage}%</span>
              <span className="text-xs text-muted-foreground">{data.attendance.total} records</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Attendance ${data.attendance.percentage}%`}>
              <div className="h-full rounded-full bg-success" style={{ width: `${data.attendance.percentage}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <Metric label="Present" value={data.attendance.present} />
              <Metric label="Late" value={data.attendance.late} />
              <Metric label="Absent" value={data.attendance.absent} />
              <Metric label="Excused" value={data.attendance.excused} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums">
                {data.performance.averageScorePercentage ?? "—"}%
              </span>
              <span className="text-xs text-muted-foreground">average score</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Weighted across all recorded assessment scores institution-wide.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums">{data.fees.collectionRate}%</span>
              <span className="text-xs text-muted-foreground">collected</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Fees collected ${data.fees.collectionRate}%`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${data.fees.collectionRate}%` }} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Billed</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(data.fees.amountDue)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Outstanding</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(data.fees.outstanding)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent enrolments</CardTitle>
          </CardHeader>
          {data.recentEnrollments.length === 0 ? (
            <CardContent className="text-sm text-muted-foreground">No enrolments recorded yet.</CardContent>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Student</TableHeaderCell>
                  <TableHeaderCell>Course</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recentEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/admin/students/${enrollment.student.id}`}>
                        {enrollment.student.firstName} {enrollment.student.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{enrollment.student.studentId}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{enrollment.course.code}</span>
                      <p className="text-xs text-muted-foreground">{enrollment.course.title}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(enrollment.enrolledAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              data.recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="border-b pb-2 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={statusTone(announcement.audience)}>{announcement.audience}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(announcement.publishedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
