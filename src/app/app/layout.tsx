import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { MobileNav, Sidebar } from "@/components/layout/app-nav";
import { OFFLINE_PAGES } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { requireFamily } from "@/lib/session";
import { loadAlerts } from "@/modules/notifications/load";
import { ConnectionStatus } from "@/modules/offline/connection-status";
import { FamilyRealtime } from "@/modules/offline/family-realtime";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const ctx = await requireFamily();
  const alerts = await loadAlerts(ctx.family.id);
  const renderedAt = new Date().toISOString();
  return (
    <div className="flex min-h-dvh">
      <Sidebar familyName={ctx.family.name} alertCount={alerts.filter((a) => a.severity !== "low").length} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur no-print">
          <Link href="/app" className="flex items-center gap-2 truncate font-semibold text-brand-800 md:hidden">
            <ShieldCheck className="size-5 shrink-0 text-ready-600" aria-hidden /> <span className="truncate">{ctx.family.name}</span>
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <ConnectionStatus renderedAt={renderedAt} offlineUrls={OFFLINE_PAGES} />
            <UserMenu name={ctx.profile.full_name} families={ctx.families} activeFamilyId={ctx.family.id} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10">{children}</main>
      </div>
      <MobileNav />
      <FamilyRealtime familyId={ctx.family.id} />
    </div>
  );
}
