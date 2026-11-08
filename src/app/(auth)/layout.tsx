import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold text-brand-800">
        <ShieldCheck className="size-6 text-ready-600" aria-hidden /> FamilyReady
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">{children}</div>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">Em perigo imediato ligue 112. O FamilyReady não substitui as instruções das autoridades.</p>
    </div>
  );
}
