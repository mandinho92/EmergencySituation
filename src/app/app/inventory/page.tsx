import { Boxes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { EXPIRY_WARNING_DAYS } from "@/domain/preparedness/alerts";
import { formatDate, formatNumber } from "@/i18n/format";
import { CATEGORY_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { markMaintained } from "@/modules/inventory/actions";
import { CONDITION_LABEL, InventoryDialog } from "@/modules/inventory/inventory-form";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Inventário" };

interface Row {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string | null;
  expiresOn: string | null;
  source: string;
  href: string;
}

function expiryTone(date: string | null, today: string, soon: string) {
  if (!date) return null;
  if (date < today) return "danger" as const;
  if (date <= soon) return "warning" as const;
  return "neutral" as const;
}

export default async function InventoryPage({ searchParams }: PageProps<"/app/inventory">) {
  const ctx = await requireFamily();
  const filter = (await searchParams).filter;
  const supabase = await createClient();
  const [data, { data: items }] = await Promise.all([
    loadPreparedness(ctx.family.id),
    supabase.from("inventory_items").select("*").eq("family_id", ctx.family.id).order("category").order("name"),
  ]);
  const canUpdate = hasRole(ctx.role, "member");
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + EXPIRY_WARNING_DAYS * 86_400_000).toISOString().slice(0, 10);

  // Unified view: kit stock is shown here but edited where it lives (single source of truth).
  const kitRows: Row[] = [
    ...data.homeLines.filter((l) => l.have > 0 && !l.excluded).map((l) => ({ id: `h:${l.id}`, name: l.name, category: l.category, quantity: l.have, unit: l.unit, location: l.storageLocation, expiresOn: l.expiresOn, source: "HOME KIT", href: `/app/home-kit#${l.category}` })),
    ...data.bags.flatMap((b) => b.lines.filter((l) => l.have > 0 && !l.excluded).map((l) => ({ id: `b:${b.bag.id}:${l.id}`, name: l.name, category: l.category, quantity: l.have, unit: l.unit, location: b.bag.name, expiresOn: l.expiresOn, source: "GO BAG", href: `/app/go-bags/${b.bag.id}` }))),
  ];
  const onlyExpiring = filter === "expiring";
  const visibleKit = onlyExpiring ? kitRows.filter((r) => r.expiresOn && r.expiresOn <= soon) : kitRows;
  const visibleItems = (items ?? []).filter((i) => !onlyExpiring || (i.expires_on && i.expires_on <= soon) || i.condition !== "ok");

  return (
    <>
      <PageHeader icon={Boxes} title="Inventário" description="O que a família tem, onde está guardado e quando expira." actions={canUpdate ? <InventoryDialog /> : undefined} />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/app/inventory" className={cn("rounded-full px-3 py-1", !onlyExpiring ? "bg-brand-700 text-white" : "bg-white ring-1 ring-slate-200")}>Tudo</Link>
        <Link href="/app/inventory?filter=expiring" className={cn("rounded-full px-3 py-1", onlyExpiring ? "bg-brand-700 text-white" : "bg-white ring-1 ring-slate-200")}>A expirar / manutenção</Link>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle>Equipamento e stock adicional</CardTitle><Badge>{visibleItems.length}</Badge></CardHeader>
        <CardContent>
          {visibleItems.length === 0 ? <p className="text-sm text-slate-500">{onlyExpiring ? "Nada a expirar nem a precisar de manutenção." : "Registe equipamento que não está nas listas (gerador, extintores, ferramentas, powerbanks extra)."}</p> : (
            <ul className="divide-y divide-slate-100">
              {visibleItems.map((i) => {
                const tone = expiryTone(i.expires_on, today, soon);
                return (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{i.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-slate-500">
                        <Badge>{CATEGORY_LABEL[i.category]}</Badge>
                        <span>{formatNumber(Number(i.quantity))} {i.unit}</span>
                        {i.storage_location && <span>· {i.storage_location}</span>}
                        {tone && <Badge tone={tone}>validade {formatDate(i.expires_on)}</Badge>}
                        {i.condition !== "ok" && <Badge tone="warning">{CONDITION_LABEL[i.condition as keyof typeof CONDITION_LABEL]}</Badge>}
                        {i.maintenance_interval_days && <span>· verificar a cada {i.maintenance_interval_days} dias{i.last_maintained_on ? ` (última ${formatDate(i.last_maintained_on)})` : ""}</span>}
                      </div>
                    </div>
                    {canUpdate && (
                      <div className="flex items-center gap-1">
                        {(i.condition !== "ok" || i.maintenance_interval_days) && <ActionButton size="sm" variant="ghost" action={markMaintained} input={{ id: i.id }} successMessage="Manutenção registada.">Verificado</ActionButton>}
                        <InventoryDialog item={i} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stock dos kits</CardTitle><Badge>{visibleKit.length}</Badge></CardHeader>
        <CardContent>
          {visibleKit.length === 0 ? (
            <EmptyState icon={Boxes} title="Sem stock registado" description="Ao marcar artigos como comprados ou existentes no HOME KIT e nas mochilas, aparecem aqui." className="border-0" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleKit.map((r) => {
                const tone = expiryTone(r.expiresOn, today, soon);
                return (
                  <li key={r.id}>
                    <Link href={r.href} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:bg-slate-50">
                      <span className="text-sm">{r.name}<span className="ml-2 text-xs text-slate-500">{formatNumber(r.quantity)} {r.unit}{r.location ? ` · ${r.location}` : ""}</span></span>
                      <span className="flex gap-1.5">{tone && <Badge tone={tone}>validade {formatDate(r.expiresOn)}</Badge>}<Badge tone="outline">{r.source}</Badge></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
