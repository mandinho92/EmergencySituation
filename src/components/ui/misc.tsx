import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, icon: Icon }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {Icon && <Icon className="size-5 text-brand-600 sm:size-6" aria-hidden />}
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-white px-6 py-10 text-center", className)}>
      <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600"><Icon className="size-6" aria-hidden /></div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />;
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "success" | "danger"; title?: string; children: React.ReactNode; className?: string }) {
  const styles = {
    info: "border-brand-100 bg-brand-50 text-brand-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-ready-100 bg-ready-50 text-ready-700",
    danger: "border-red-200 bg-red-50 text-red-800",
  }[tone];
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", styles, className)} role={tone === "danger" ? "alert" : "note"}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      <div className="[&_a]:underline">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {Icon && <Icon className="size-4" aria-hidden />}
        {label}
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
