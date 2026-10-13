import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { env } from "@/lib/env";

/**
 * Shared layout for all authenticated areas. The session is resolved on the
 * server on every request, and the middleware has already filtered by area.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      session={{ name: session.name, email: session.email, role: session.role }}
      appName={env.NEXT_PUBLIC_APP_NAME}
    >
      <div id="main">{children}</div>
    </AppShell>
  );
}
