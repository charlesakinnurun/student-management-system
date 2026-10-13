"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { loginSchema } from "@/lib/validation/auth";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post<{ redirectTo: string }>("/api/auth/login", parsed.data);
      // Only allow same-origin relative redirects.
      const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : result.redirectTo;
      toast.success("Signed in successfully");
      router.push(target);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to sign in. Please try again.";
      setErrors({ password: message });
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Email" htmlFor="email" error={errors.email} required>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@institution.edu"
              aria-invalid={Boolean(errors.email)}
              required
            />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password} required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              required
            />
          </FormField>

          <Button type="submit" loading={submitting} className="w-full">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
