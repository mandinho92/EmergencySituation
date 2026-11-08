"use client";

import { Menu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY, NAV_GROUPS, type NavItem } from "./nav-config";

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors", active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
    >
      <item.icon className={cn("size-4", active ? "text-brand-600" : "text-slate-400")} aria-hidden />
      {item.label}
    </Link>
  );
}

function NavGroups({ pathname, onNavigate, badge }: { pathname: string; onNavigate?: () => void; badge?: number }) {
  return (
    <nav className="space-y-5" aria-label="Aplicação">
      {NAV_GROUPS.map((g) => (
        <div key={g.label || "main"}>
          {g.label && <p className="mb-1 px-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">{g.label}</p>}
          <div className="space-y-0.5">
            {g.items.map((i) => (
              <div key={i.href} className="relative">
                <NavLink item={i} pathname={pathname} onNavigate={onNavigate} />
                {i.href === "/app" && badge ? <span className="absolute top-2 right-2 rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800" aria-label={`${badge} alertas`}>{badge}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ familyName, alertCount }: { familyName: string; alertCount: number }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex no-print">
      <Link href="/app" className="mb-1 flex items-center gap-2 px-2.5 font-semibold text-brand-800">
        <ShieldCheck className="size-5 text-ready-600" aria-hidden /> FamilyReady
      </Link>
      <p className="mb-5 truncate px-2.5 text-xs text-slate-500">{familyName}</p>
      <div className="flex-1 overflow-y-auto"><NavGroups pathname={pathname} badge={alertCount} /></div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden no-print" aria-label="Navegação principal">
      <div className="grid grid-cols-5">
        {MOBILE_PRIMARY.map((i) => {
          const active = isActive(pathname, i.href) || (i.href === "/app/home-kit" && pathname.startsWith("/app/go-bags"));
          return (
            <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-700" : "text-slate-500")}>
              <i.icon className="size-5" aria-hidden />
              {i.label}
            </Link>
          );
        })}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
            <Menu className="size-5" aria-hidden /> Mais
          </DialogTrigger>
          <DialogContent title="Menu">
            <NavGroups pathname={pathname} onNavigate={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}
