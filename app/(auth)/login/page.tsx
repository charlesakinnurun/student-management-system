import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/rbac";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { env } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role]);

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            SMS
          </span>
          <h1 className="mt-3 text-lg font-semibold">{env.NEXT_PUBLIC_APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <LoginForm redirectTo={searchParams.next} />
      </div>
    </main>
  );
}
