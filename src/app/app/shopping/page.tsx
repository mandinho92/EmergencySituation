import { ShoppingCart, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader, Stat } from "@/components/ui/misc";
import { formatMoney } from "@/i18n/format";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/i18n/messages";
import { hasRole, requireFamily } from "@/lib/session";
import { AddShoppingItem } from "@/modules/shopping/add-item";
import { loadShopping, STORE_HINT } from "@/modules/shopping/load";
import { ShoppingList } from "@/modules/shopping/shopping-list";
import { BudgetDialog } from "@/modules/shopping/budget-dialog";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function ShoppingPage() {
  const ctx = await requireFamily();
  const { lines, budget } = await loadShopping(ctx.family.id, ctx.family.budget_cents);
  const toBuy = lines.filter((l) => l.status === "to_buy");
  const essentialsLeft = toBuy.filter((l) => l.priority === 0).length;
  const maxCategory = Math.max(1, ...budget.byCategory.map((c) => c.totalCents));

  return (
    <>
      <PageHeader icon={ShoppingCart} title="Lista de compras" description="Gerada a partir do HOME KIT e das mochilas. Compre de forma progressiva, essenciais primeiro." actions={
        <>
          {hasRole(ctx.role, "editor") && <BudgetDialog budgetCents={ctx.family.budget_cents} />}
          {hasRole(ctx.role, "member") && <AddShoppingItem />}
        </>
      } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label="Orçamento" value={ctx.family.budget_cents == null ? "Sem limite" : formatMoney(ctx.family.budget_cents)} hint={budget.remainingBudgetCents != null ? `Disponível após plano: ${formatMoney(budget.remainingBudgetCents)}` : undefined} />
        <Stat label="Custo total estimado" value={formatMoney(budget.totalCents)} hint={budget.linesWithoutPrice ? `${budget.linesWithoutPrice} artigo(s) sem preço` : undefined} />
        <Stat label="Essenciais (P0)" value={formatMoney(budget.essentialCents)} hint={`${essentialsLeft} por comprar`} />
        <Stat label="Cabe no orçamento" value={formatMoney(budget.withinBudgetCents)} hint={`${toBuy.filter((l) => l.budget === "within_budget").length} de ${toBuy.length} artigos`} />
      </div>

      {budget.blockedAtPriority != null && (
        <Notice tone="warning" className="mt-4" title="O orçamento não cobre todos os artigos">
          O orçamento restante fica reservado para os artigos {PRIORITY_LABEL[budget.blockedAtPriority]} ainda em falta. Nenhum essencial foi retirado da lista: os artigos fora do orçamento continuam visíveis para comprar mais tarde.
        </Notice>
      )}
      <Notice className="mt-4">Os valores “≈” são estimativas de planeamento (dados de demonstração, não verificados) e não constituem ofertas. Confirme sempre o preço e a disponibilidade na loja.</Notice>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ShoppingList lines={lines} familyId={ctx.family.id} canUpdate={hasRole(ctx.role, "member")} storeHints={STORE_HINT} />
        <Card className="h-fit">
          <CardHeader><CardTitle>Custo por categoria</CardTitle></CardHeader>
          <CardContent>
            {budget.byCategory.length === 0 ? <p className="text-sm text-slate-500">Sem custos por comprar.</p> : (
              <ul className="space-y-2.5">
                {budget.byCategory.map((c) => (
                  <li key={c.category} className="text-sm">
                    <div className="flex justify-between"><span>{CATEGORY_LABEL[c.category]}</span><span className="tabular-nums">{formatMoney(c.totalCents)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${CATEGORY_LABEL[c.category]}: ${formatMoney(c.withinBudgetCents)} dentro do orçamento de ${formatMoney(c.totalCents)}`}>
                      <div className="flex h-full" style={{ width: `${(c.totalCents / maxCategory) * 100}%` }}>
                        <div className="h-full bg-ready-500" style={{ width: `${c.totalCents ? (c.withinBudgetCents / c.totalCents) * 100 : 0}%` }} />
                        <div className="h-full flex-1 bg-amber-300" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-ready-500" /> no orçamento</span><span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-300" /> fora</span></p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
