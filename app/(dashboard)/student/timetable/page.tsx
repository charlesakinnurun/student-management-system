import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getStudentTimetable, DAY_ORDER } from "@/lib/services/timetable.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Timetable" };

export default async function StudentTimetablePage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const entries = await getStudentTimetable(session.studentProfileId);
  const scheduled = entries.filter((entry) => entry.days.length > 0);
  const unscheduled = entries.filter((entry) => entry.days.length === 0);

  return (
    <>
      <PageHeader title="Timetable" description="Your weekly class schedule for the current term." />

      {entries.length === 0 ? (
        <Card>
          <EmptyState title="No schedule yet" description="Your courses do not have a timetable set up." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DAY_ORDER.filter((day) => scheduled.some((entry) => entry.days.includes(day))).map((day) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle>{day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scheduled
                  .filter((entry) => entry.days.includes(day))
                  .map((entry) => (
                    <div key={`${entry.enrollmentId}-${day}`} className="rounded-md border p-3">
                      <p className="text-sm font-medium">
                        {entry.course.code} — {entry.course.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.startTime ?? "—"} – {entry.endTime ?? "—"} · {entry.venue ?? "Venue TBA"}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.lecturer ?? "Lecturer TBA"}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {unscheduled.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Unscheduled courses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unscheduled.map((entry) => (
              <span key={entry.enrollmentId} className="rounded-md border px-2 py-1 text-xs">
                {entry.course.code} — {entry.course.title}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
