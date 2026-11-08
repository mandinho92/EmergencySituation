import * as React from "react";
import { cn } from "@/lib/utils";

const control = "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:border-red-400";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "h-10 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-slate-800", className)} {...props} />;
}

/** Label + control + hint/error, wired for accessibility. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-400">(opcional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Checkbox row with label and optional description. */
export function CheckboxField({ name, label, description, defaultChecked, disabled, value }: { name: string; label: string; description?: string; defaultChecked?: boolean; disabled?: boolean; value?: string }) {
  const id = `${name}-${value ?? "cb"}`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 has-checked:border-brand-500 has-checked:bg-brand-50/40">
      <input id={id} type="checkbox" name={name} value={value} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 size-4 rounded border-slate-300 accent-brand-700" />
      <span className="text-sm">
        <span className="font-medium text-slate-900">{label}</span>
        {description && <span className="block text-slate-500">{description}</span>}
      </span>
    </label>
  );
}
