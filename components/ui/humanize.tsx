import { humanize } from "@/lib/utils";

/** Inline status/value humaniser for enum-like strings (ALL -> All). */
export function Humanize({ value }: { value: string }) {
  return <>{humanize(value)}</>;
}
