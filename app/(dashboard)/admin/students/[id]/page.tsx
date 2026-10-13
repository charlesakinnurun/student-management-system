import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/services/student.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { getStudentAttendance } from "@/lib/services/attendance.service";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Student profile" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  let student: Awaited<ReturnType<typeof getStudentDetail>>;
  try {
    student = await getStudentDetail(params.id);
  } catch {
    notFound();
  }

  const attendance = await getStudentAttendance(student.id);
  const totalDue = student.fees.reduce((sum, fee) => sum + fee.amountDue, 0);
  const totalPaid = student.fees.reduce((sum, fee) => sum + fee.amountPaid, 0);

  return (
    <>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={student.studentId}
        actions={
          <Link href="/admin/students" className="text-sm text-primary underline underline-offset-4">
            Back to students
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Email" value={student.user.email} />
              <Field label="Phone" value={student.phone} />
              <Field label="Gender" value={student.gender} />
              <Field label="Date of birth" value={formatDate(student.dateOfBirth)} />
              <Field label="Faculty" value={student.faculty?.name} />
              <Field label="Department" value={student.department?.name} />
              <Field label="Programme" value={student.program?.name} />
              <Field label="Level" value={student.level} />
              <Field
                label="Status"
                value={<Badge tone={statusTone(student.status)}>{student.status}</Badge>}
              />
              <Field label="Admission date" value={formatDate(student.admissionDate)} />
              <Field label="Emergency contact" value={student.emergencyContact} />
              <Field label="Address" value={student.address} />
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{attendance.overall.percentage}%</p>
              <p className="text-xs text-muted-foreground">
                {attendance.overall.present} present · {attendance.overall.late} late ·{" "}
                {attendance.overall.absent} absent · {attendance.overall.excused} excused
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">
                paid of {formatCurrency(totalDue)} · outstanding {formatCurrency(totalDue - totalPaid)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Enrolments</CardTitle>
        </CardHeader>
        {student.enrollments.length === 0 ? (
          <CardContent className="text-sm text-muted-foreground">This student is not enrolled in any course.</CardContent>
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
              {student.enrollments.map((enrollment) => (
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
