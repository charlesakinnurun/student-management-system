import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listStudentFees } from "@/lib/services/fee.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Fees" };

export default async function StudentFeesPage() {
  const session = await getSession();
  if (!session?.studentProfileId) redirect("/login");

  const fees = await listStudentFees(session.studentProfileId);
  const totalDue = fees.reduce((sum, fee) => sum + fee.amountDue, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.amountPaid, 0);

  return (
    <>
      <PageHeader title="Fees" description="Your fee statements and payment history." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total billed" value={formatCurrency(totalDue)} />
        <StatCard label="Total paid" value={formatCurrency(totalPaid)} />
        <StatCard label="Outstanding" value={formatCurrency(totalDue - totalPaid)} />
      </div>

      {fees.length === 0 ? (
        <Card className="mt-4">
          <EmptyState title="No fee records" description="No fees have been recorded for your account." />
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {fees.map((fee) => (
            <Card key={fee.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{fee.session.name}</span>
                  <Badge tone={statusTone(fee.status)}>{fee.status}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Due {formatDate(fee.dueDate)} · {formatCurrency(fee.amountPaid)} of{" "}
                  {formatCurrency(fee.amountDue)} paid
                </p>
              </CardHeader>
              {fee.payments.length > 0 ? (
                <CardContent className="space-y-2">
                  {fee.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0">
                      <span>
                        {formatCurrency(payment.amount)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {payment.method ?? "—"} {payment.reference ? `· ${payment.reference}` : ""}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</span>
                    </div>
                  ))}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
