import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "destructive";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Map a status string to a semantic tone, used across modules. */
export function statusTone(status: string): Tone {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "PAID":
    case "PRESENT":
    case "COMPLETED":
    case "PUBLISHED":
      return "success";
    case "PENDING":
    case "PARTIAL":
    case "LATE":
      return "warning";
    case "SUSPENDED":
    case "WITHDRAWN":
    case "OVERDUE":
    case "ABSENT":
    case "UNPAID":
    case "INACTIVE":
      return "destructive";
    case "EXCUSED":
      return "primary";
    default:
      return "neutral";
  }
}
