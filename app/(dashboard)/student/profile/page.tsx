import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentDetail } from "@/lib/services/student.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My profile" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const student = await getStudentDetail(session.studentProfileId);

  return (
    <>
      <PageHeader title="My profile" description="Your academic record. Contact the registry to correct details." />
      <Card>
        <CardHeader>
          <CardTitle>{student.studentId}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="First name" value={student.firstName} />
            <Field label="Last name" value={student.lastName} />
            <Field label="Email" value={student.user.email} />
            <Field label="Phone" value={student.phone} />
            <Field label="Gender" value={student.gender} />
            <Field label="Date of birth" value={formatDate(student.dateOfBirth)} />
            <Field label="Faculty" value={student.faculty?.name} />
            <Field label="Department" value={student.department?.name} />
            <Field label="Programme" value={student.program?.name} />
            <Field label="Level" value={student.level} />
            <Field label="Status" value={<Badge tone={statusTone(student.status)}>{student.status}</Badge>} />
            <Field label="Admission date" value={formatDate(student.admissionDate)} />
            <Field label="Emergency contact" value={student.emergencyContact} />
            <Field label="Address" value={student.address} />
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
