import { Droplets, House, Printer, Soup } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Notice, PageHeader, Stat } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/progress";
import { weightedCoverage } from "@/domain/preparedness/kit-lines";
import { formatNumber } from "@/i18n/format";
import { CATEGORY_LABEL, HOME_KIT_CATEGORIES } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { AddCustomHomeItem, HomeItemEditDialog } from "@/modules/home-kit/item-forms";
import { KitSettingsDialog } from "@/modules/home-kit/preferences-form";
import { CategoryChips, CategorySection } from "@/modules/kits/category-section";
import { KitItemRow } from "@/modules/kits/kit-item-row";
import { KitList } from "@/modules/kits/kit-list";
import { KitTabs } from "@/components/layout/kit-tabs";
import { toViews } from "@/modules/kits/view";
import { loadPreparedness } from "@/modules/preparedness/load";
import { loadPriceIndex } from "@/modules/products/pricing";

export const metadata: Metadata = { title: "HOME KIT" };

export default async function HomeKitPage() {
  const ctx = await requireFamily();
  const [data, prices] = await Promise.all([loadPreparedness(ctx.family.id), loadPriceIndex()]);
  const views = await toViews(data.homeLines, ctx.family.id);
  const viewById = new Map(views.map((v) => [v.id, v]));
  const canUpdate = hasRole(ctx.role, "member");
  const canEdit = hasRole(ctx.role, "editor");
  const days = data.settings.targetDays;
  const w = data.plan.water;
  const waterMissing = Math.max(0, data.water.requiredLiters - data.water.haveLiters);
  const foodDays = data.foodAutonomyDays;
  const categories = HOME_KIT_CATEGORIES.map((cat) => ({ cat, lines: data.homeLines.filter((l) => l.category === cat) })).filter((c) => c.lines.length > 0);

  const productsByKey = new Map<string, Array<{ id: string; name: string }>>();
  for (const p of prices.products) if (p.item_key) productsByKey.set(p.item_key, [...(productsByKey.get(p.item_key) ?? []), { id: p.id, name: p.name }]);

  return (
    <>
      <KitTabs active="home" />
      <PageHeader
        icon={House}
        title="HOME KIT"
        description={`Preparar a habitação para permanecer em casa ${days === 1 ? "24 horas" : `${days} dias`} sem abastecimento. Separado das mochilas de evacuação.`}
        actions={
          <>
            {canEdit && <KitSettingsDialog targetDays={days} waterOverride={data.homeKit.water_adult_l_per_day} includeHygiene={data.homeKit.include_hygiene_water} hotClimate={data.homeKit.hot_climate} />}
            {canEdit && <AddCustomHomeItem />}
            <Button asChild size="sm" variant="ghost"><Link href="/app/print/home-kit"><Printer aria-hidden /> Imprimir</Link></Button>
          </>
        }
      />

      {data.members.length === 0 ? (
        <EmptyState icon={House} title="Adicione os membros do agregado" description="O HOME KIT é calculado a partir da composição da família." action={<Button asChild><Link href="/app/members">Adicionar membros</Link></Button>} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card id="water" className="scroll-mt-20 sm:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Droplets className="size-4 text-brand-600" aria-hidden />Água</CardTitle><Badge tone={waterMissing > 0 ? "warning" : "ready"}>{waterMissing > 0 ? `Falta comprar ${formatNumber(waterMissing)} L` : "Completo"}</Badge></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-xs text-slate-500">Necessária</p><p className="text-lg font-semibold tabular-nums">{data.water.requiredLiters} L</p></div>
                  <div><p className="text-xs text-slate-500">Existente</p><p className="text-lg font-semibold tabular-nums">{formatNumber(data.water.haveLiters)} L</p></div>
                  <div><p className="text-xs text-slate-500">Garrafões de 5 L</p><p className="text-lg font-semibold tabular-nums">{w.containers.count}</p></div>
                </div>
                <ProgressBar value={(data.water.haveLiters / Math.max(1, data.water.requiredLiters)) * 100} label="Água" />
                <p className="text-xs text-slate-500">Por dia: {formatNumber(w.perDay.drinking)} L beber · {formatNumber(w.perDay.cooking)} L cozinhar · {formatNumber(w.perDay.hygiene)} L higiene{w.perDay.pets > 0 ? ` · ${formatNumber(w.perDay.pets)} L animais` : ""} = {formatNumber(w.perDay.total)} L/dia, + {formatNumber(w.reserveLiters)} L de reserva.</p>
                {w.warnings.map((t) => <p key={t} className="text-xs text-amber-700">{t}</p>)}
              </CardContent>
            </Card>
            <Stat icon={Soup} label="Alimentação" value={foodDays == null ? "—" : `${foodDays} de ${days} dias`} hint={foodDays != null && foodDays < days ? `Falta preparar ${days - foodDays} dia(s)` : "Limitado pelo grupo de alimentos mais escasso"} />
          </div>

          <Notice className="mt-4">Quantidades de referência para planeamento. Medicação e alimentação infantil devem ser definidas com o médico, farmacêutico ou pediatra. Preços “≈” são estimativas de planeamento.</Notice>

          <div className="mt-4">
            <CategoryChips items={categories.map((c) => ({ id: c.cat, label: CATEGORY_LABEL[c.cat], missing: c.lines.filter((l) => !l.excluded && l.missing > 0).length }))} />
            <KitList completeCount={data.homeLines.filter((l) => l.excluded || l.missing <= 0).length}>
              <div className="space-y-3">
                {categories.map(({ cat, lines }) => (
                  <CategorySection key={cat} id={cat} title={CATEGORY_LABEL[cat]} done={lines.filter((l) => l.excluded || l.missing <= 0).length} total={lines.length} coverage={weightedCoverage(lines)}>
                    {lines.map((l) => {
                      const v = viewById.get(l.id)!;
                      return (
                        <KitItemRow key={l.id} line={v} kind="home" familyId={ctx.family.id} canUpdate={canUpdate}
                          editSlot={canEdit ? <HomeItemEditDialog line={v} computedRequired={l.computedRequired} products={l.productKey ? productsByKey.get(l.productKey) ?? [] : []} /> : undefined} />
                      );
                    })}
                  </CategorySection>
                ))}
              </div>
            </KitList>
          </div>
        </>
      )}
    </>
  );
}
