import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "bg-slate-100 text-slate-700",
      brand: "bg-brand-50 text-brand-700",
      ready: "bg-ready-50 text-ready-700",
      warning: "bg-amber-50 text-amber-800",
      danger: "bg-red-50 text-red-700",
      outline: "border border-slate-200 text-slate-600",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function PriorityBadge({ priority }: { priority: number }) {
  const tone = priority === 0 ? "danger" : priority === 1 ? "warning" : priority === 2 ? "brand" : "neutral";
  return <Badge tone={tone} title={["Essencial", "Muito importante", "Recomendado", "Opcional"][priority]}>P{priority}</Badge>;
}
