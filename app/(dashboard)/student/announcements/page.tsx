import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAnnouncementsForStudent } from "@/lib/services/announcement.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Announcements" };

export default async function StudentAnnouncementsPage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const announcements = await listAnnouncementsForStudent(session.studentProfileId);

  return (
    <>
      <PageHeader title="Announcements" description="Institution-wide notices and updates for your courses." />
      {announcements.length === 0 ? (
        <Card>
          <EmptyState title="No announcements" description="There are no announcements for you right now." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{announcement.title}</h2>
                  <Badge tone={statusTone(announcement.audience)}>{announcement.audience}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{announcement.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(announcement.publishedAt)} · {announcement.author.email}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
