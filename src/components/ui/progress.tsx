import { cn } from "@/lib/utils";

function toneFor(value: number) {
  if (value >= 80) return { bar: "bg-ready-500", text: "text-ready-700", stroke: "stroke-ready-500" };
  if (value >= 40) return { bar: "bg-brand-500", text: "text-brand-700", stroke: "stroke-brand-500" };
  return { bar: "bg-amber-500", text: "text-amber-700", stroke: "stroke-amber-500" };
}

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", toneFor(v).bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 120, stroke = 10, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = toneFor(v);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Progresso"}: ${v}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-slate-100" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" className={cn("fill-none transition-[stroke-dashoffset] duration-700", tone.stroke)} strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} />
      </svg>
      <span className={cn("absolute text-2xl font-semibold tabular-nums", tone.text)}>{v}%</span>
    </div>
  );
}
