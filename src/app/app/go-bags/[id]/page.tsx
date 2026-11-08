import { Backpack, Printer, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Notice, PageHeader, Stat } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/progress";
import { weightedCoverage } from "@/domain/preparedness/kit-lines";
import { formatDate, formatWeight } from "@/i18n/format";
import { BAG_CATEGORIES, CATEGORY_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { deleteBag, markBagChecked } from "@/modules/go-bags/actions";
import { AddBagItem, BagItemEditDialog, BagSettingsDialog } from "@/modules/go-bags/forms";
import { CategoryChips, CategorySection } from "@/modules/kits/category-section";
import { KitItemRow } from "@/modules/kits/kit-item-row";
import { KitList } from "@/modules/kits/kit-list";
import { toViews } from "@/modules/kits/view";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Mochila de evacuação" };

export default async function BagPage({ params }: PageProps<"/app/go-bags/[id]">) {
  const { id } = await params;
  const ctx = await requireFamily();
  const data = await loadPreparedness(ctx.family.id);
  const view = data.bags.find((b) => b.bag.id === id);
  if (!view) notFound();
  const { bag, lines, weight, owner } = view;
  const views = await toViews(lines, ctx.family.id);
  const byId = new Map(views.map((v) => [v.id, v]));
  const canEdit = hasRole(ctx.role, "editor");
  const coverage = Math.round(weightedCoverage(lines, "bag") * 100);
  const packed = lines.filter((l) => !l.excluded && l.isPacked).length;
  const active = lines.filter((l) => !l.excluded).length;
  const categories = BAG_CATEGORIES.map((cat) => ({ cat, lines: lines.filter((l) => l.category === cat) })).filter((c) => c.lines.length > 0);

  return (
    <>
      <Link href="/app/go-bags" className="text-sm text-brand-600 hover:underline no-print">← Todas as mochilas</Link>
      <PageHeader
        icon={Backpack}
        title={bag.name}
        description={owner ? `Responsável: ${owner.displayName}${bag.capacity_liters ? ` · ${bag.capacity_liters} L` : ""}` : bag.kind === "pet" ? "Kit do animal para evacuação" : "Sem responsável definido"}
        actions={
          <>
            {hasRole(ctx.role, "member") && <ActionButton size="sm" variant="secondary" action={markBagChecked} input={{ id: bag.id }} successMessage="Verificação registada.">Registar verificação</ActionButton>}
            {canEdit && <BagSettingsDialog bag={bag} members={data.memberRows.filter((m) => bag.kind === "child" ? m.category === "child" : m.category === "adult" || m.category === "senior")} />}
            {canEdit && <AddBagItem bagId={bag.id} />}
            <Button asChild size="sm" variant="ghost"><Link href={`/app/print/go-bag/${bag.id}`}><Printer aria-hidden /> Imprimir / exportar</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Preparação" value={`${coverage}%`} hint={<ProgressBar value={coverage} className="mt-1" />} />
        <Stat label="Na mochila" value={`${packed} / ${active}`} />
        <Stat icon={Scale} label="Peso estimado" value={formatWeight(weight.totalGrams)} hint={weight.limitGrams ? `Limite de planeamento: ${formatWeight(weight.limitGrams)}` : undefined} />
        <Stat label="Última verificação" value={<span className="text-base">{bag.last_checked_at ? formatDate(bag.last_checked_at) : "Nunca"}</span>} hint="Recomendado: a cada 3 meses" />
      </div>
      {weight.overLimit && <Notice tone="warning" className="mt-4">O peso estimado ultrapassa o limite de planeamento para {owner?.displayName ?? "esta pessoa"}. Distribua artigos por outras mochilas ou reduza quantidades.</Notice>}

      <div className="mt-4">
        <CategoryChips items={categories.map((c) => ({ id: `bag-${c.cat}`, label: CATEGORY_LABEL[c.cat], missing: c.lines.filter((l) => !l.excluded && !l.isPacked).length }))} />
        <KitList completeCount={lines.filter((l) => l.excluded || l.isPacked).length}>
          <div className="space-y-3">
            {categories.map(({ cat, lines: catLines }) => (
              <CategorySection key={cat} id={`bag-${cat}`} title={CATEGORY_LABEL[cat]} done={catLines.filter((l) => l.excluded || l.isPacked).length} total={catLines.length} coverage={weightedCoverage(catLines, "bag")}>
                {catLines.map((l) => {
                  const v = byId.get(l.id)!;
                  return <KitItemRow key={l.id} line={v} kind="bag" familyId={ctx.family.id} bagId={bag.id} canUpdate={hasRole(ctx.role, "member")} editSlot={canEdit ? <BagItemEditDialog bagId={bag.id} line={v} computedRequired={l.computedRequired} /> : undefined} />;
                })}
              </CategorySection>
            ))}
          </div>
        </KitList>
      </div>
      {canEdit && (
        <div className="mt-6 no-print">
          <ActionButton variant="ghost" size="sm" action={deleteBag} input={{ id: bag.id }} confirm={`Remover ${bag.name} e o seu progresso?`}>Remover mochila</ActionButton>
        </div>
      )}
    </>
  );
}
