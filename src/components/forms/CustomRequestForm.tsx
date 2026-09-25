"use client";

import { useState, type FormEvent } from "react";
import { vi } from "../../lib/i18n/vi";
import { customRequestSchema, normalizeBudgetInput, validationMessageKey } from "../../lib/validation/custom-request";

const copy = vi.customRequest;

type FormValues = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  briefDescription: string;
  genrePreference: string;
  targetDuration: string;
  referenceLinks: string;
  budgetEstimate: string;
  website: string;
};

const initialValues: FormValues = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  briefDescription: "",
  genrePreference: "",
  targetDuration: "",
  referenceLinks: "",
  budgetEstimate: "",
  website: "",
};

type Field = Exclude<keyof FormValues, "website">;

function messageFor(key: string): string {
  const validation = copy.validation as Record<string, string>;
  return validation[key] ?? copy.error;
}

function useCustomRequestForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error" | "rateLimited">("idle");

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;
    const budget = normalizeBudgetInput(values.budgetEstimate);
    if (values.budgetEstimate.trim() && budget === null) {
      setErrors({ budgetEstimate: "invalidBudget" });
      return;
    }
    const parsed = customRequestSchema.safeParse({ ...values, budgetEstimate: budget });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (!next[field]) next[field] = validationMessageKey(field, issue.message);
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setState("submitting");
    try {
      const response = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          budgetEstimate: parsed.data.budgetEstimate === null ? null : Number(parsed.data.budgetEstimate),
          website: values.website,
        }),
      });
      if (response.ok) {
        setState("success");
        setValues(initialValues);
        return;
      }
      if (response.status === 429) {
        setState("rateLimited");
        return;
      }
      const result: unknown = await response.json();
      if (response.status === 400 && result && typeof result === "object" && "errors" in result) {
        setErrors((result as { errors: Record<string, string> }).errors);
      }
      setState("error");
    } catch {
      setState("error");
    }
  }

  return { values, errors, state, update, submit };
}

export default function CustomRequestForm() {
  const { values, errors, state, update, submit } = useCustomRequestForm();
  const fields: { name: Field; label: string; type?: string; help?: string; required?: boolean }[] = [
    { name: "customerName", label: copy.name, required: true },
    { name: "customerEmail", label: copy.email, type: "email", required: true },
    { name: "customerPhone", label: copy.phone, type: "tel" },
    { name: "genrePreference", label: copy.genre },
    { name: "targetDuration", label: copy.duration },
    { name: "budgetEstimate", label: copy.budget, help: copy.budgetHelp },
  ];

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-lg border border-neutral-300 bg-white p-5 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(({ name, label, type = "text", help, required }) => (
          <div key={name} className="space-y-1">
            <label htmlFor={name} className="block text-sm font-medium text-neutral-900">{label}</label>
            <input
              id={name}
              name={name}
              type={type}
              value={values[name]}
              required={required}
              aria-invalid={Boolean(errors[name])}
              aria-describedby={errors[name] ? `${name}-error` : help ? `${name}-help` : undefined}
              onChange={(event) => update(name, event.target.value)}
              className="w-full rounded-md border border-neutral-400 px-3 py-2 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            />
            {help && <p id={`${name}-help`} className="text-sm text-neutral-600">{help}</p>}
            {errors[name] && <p id={`${name}-error`} className="text-sm text-red-700">{messageFor(errors[name])}</p>}
          </div>
        ))}
      </div>

      {([
        { name: "briefDescription" as const, label: copy.brief, help: copy.briefHelp, required: true, rows: 6 },
        { name: "referenceLinks" as const, label: copy.references, help: "", required: false, rows: 3 },
      ]).map(({ name, label, help, required, rows }) => (
        <div key={name} className="space-y-1">
          <label htmlFor={name} className="block text-sm font-medium text-neutral-900">{label}</label>
          <textarea
            id={name}
            name={name}
            rows={rows}
            required={required}
            value={values[name]}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={errors[name] ? `${name}-error` : help ? `${name}-help` : undefined}
            onChange={(event) => update(name, event.target.value)}
            className="w-full rounded-md border border-neutral-400 px-3 py-2 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          />
          {help && <p id={`${name}-help`} className="text-sm text-neutral-600">{help}</p>}
          {errors[name] && <p id={`${name}-error`} className="text-sm text-red-700">{messageFor(errors[name])}</p>}
        </div>
      ))}

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">{copy.website}</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => update("website", event.target.value)} />
      </div>

      {state === "success" && <p role="status" className="text-green-800">{copy.success}</p>}
      {state === "error" && <p role="alert" className="text-red-700">{copy.error}</p>}
      {state === "rateLimited" && <p role="alert" className="text-red-700">{copy.rateLimited}</p>}
      <button type="submit" disabled={state === "submitting"} className="rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:opacity-60">
        {state === "submitting" ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
