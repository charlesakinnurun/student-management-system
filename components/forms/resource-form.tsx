"use client";

import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type FieldType = "text" | "email" | "password" | "number" | "date" | "tel" | "select" | "textarea" | "checkbox";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: Array<{ label: string; value: string }>;
  /** Span both columns of the 2-column layout. */
  fullWidth?: boolean;
  disabled?: boolean;
}

export type FormValues = Record<string, string | boolean>;

export interface ResourceFormProps {
  fields: FieldConfig[];
  /** Shared Zod schema; drives client-side validation before submission. */
  schema?: ZodType;
  initialValues?: FormValues;
  submitLabel?: string;
  columns?: 1 | 2;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
}

function defaultsFor(fields: FieldConfig[], initial?: FormValues): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const initialValue = initial?.[field.name];
    values[field.name] = initialValue ?? (field.type === "checkbox" ? false : "");
  }
  return values;
}

/**
 * Declarative form renderer. Validation runs client-side with the same Zod
 * schema the API uses; server-side field errors are then merged in, so the two
 * layers can never drift apart.
 */
export function ResourceForm({
  fields,
  schema,
  initialValues,
  submitLabel = "Save",
  columns = 2,
  onSubmit,
  onCancel,
}: ResourceFormProps) {
  const [values, setValues] = useState<FormValues>(() => defaultsFor(fields, initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  function setValue(name: string, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});

    if (schema) {
      const result = schema.safeParse(values);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        else toast.error(error.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className={columns === 2 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
        {fields.map((field) => {
          const id = `field-${field.name}`;
          const value = values[field.name];
          const common = {
            id,
            name: field.name,
            disabled: field.disabled || submitting,
            "aria-invalid": Boolean(errors[field.name]),
            "aria-required": field.required || undefined,
          };

          return (
            <FormField
              key={field.name}
              label={field.label}
              htmlFor={id}
              error={errors[field.name]}
              hint={field.hint}
              required={field.required}
              className={field.fullWidth ? "sm:col-span-2" : undefined}
            >
              {field.type === "select" ? (
                <Select
                  {...common}
                  value={typeof value === "string" ? value : ""}
                  onChange={(event) => setValue(field.name, event.target.value)}
                >
                  <option value="">{field.placeholder ?? "Select…"}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  {...common}
                  value={typeof value === "string" ? value : ""}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              ) : field.type === "checkbox" ? (
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={id}
                    name={field.name}
                    checked={Boolean(value)}
                    disabled={common.disabled}
                    onChange={(event) => setValue(field.name, event.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-muted-foreground">{field.placeholder ?? "Yes"}</span>
                </label>
              ) : (
                <Input
                  {...common}
                  type={field.type}
                  value={typeof value === "string" ? value : ""}
                  placeholder={field.placeholder}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              )}
            </FormField>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
