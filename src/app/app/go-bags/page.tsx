import { Backpack, Baby, PawPrint, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/progress";
import { childBagCandidates } from "@/domain/preparedness/go-bag";
import { weightedCoverage } from "@/domain/preparedness/kit-lines";
import { isBagReady } from "@/domain/preparedness/readiness";
import { formatDate, formatWeight } from "@/i18n/format";
import { hasRole, requireFamily } from "@/lib/session";
import { createChildBag, createSuggestedBags } from "@/modules/go-bags/actions";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "GO BAGS" };

export default async function GoBagsPage() {
  const ctx = await requireFamily();
  const data = await loadPreparedness(ctx.family.id);
  const canEdit = hasRole(ctx.role, "editor");
  const adults = data.members.filter((m) => m.category === "adult" || m.category === "senior");
  const missingAdults = adults.filter((a) => !data.bags.some((b) => b.bag.owner_member_id === a.id)).length;
  const missingPets = data.pets.filter((p) => !data.bags.some((b) => b.bag.pet_id === p.id)).length;
  const candidates = childBagCandidates(data.members, data.bags.map((b) => ({ id: b.bag.id, kind: b.bag.kind as "adult" | "child" | "pet", ownerMemberId: b.bag.owner_member_id, petId: b.bag.pet_id })));

  return (
    <>
      <PageHeader icon={Backpack} title="GO BAGS" description="Mochilas de evacuação imediata para cerca de 72 horas fora de casa. Independentes do HOME KIT." />
      <Notice className="mb-4">Uma mochila por adulto. Bebés e crianças pequenas têm os seus artigos na mochila do adulto responsável. Crianças a partir dos 6 anos podem levar uma mochila leve.</Notice>

      {data.bags.length === 0 ? (
        <EmptyState
          icon={Backpack}
          title="Ainda não há mochilas"
          description={adults.length === 0 ? "Adicione os adultos do agregado para gerar as mochilas." : `Vamos sugerir ${adults.length} mochila(s) de adulto${data.pets.length ? ` e ${data.pets.length} kit(s) para animais` : ""}.`}
          action={adults.length === 0 ? <Button asChild><Link href="/app/members">Adicionar membros</Link></Button> : canEdit ? <ActionButton action={createSuggestedBags} input={{}}><Sparkles aria-hidden /> Criar mochilas sugeridas</ActionButton> : undefined}
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.bags.map(({ bag, lines, weight, owner }) => {
              const coverage = Math.round(weightedCoverage(lines, "bag") * 100);
              const ready = isBagReady(lines);
              const missing = lines.filter((l) => !l.excluded && !l.isPacked).length;
              return (
                <li key={bag.id}>
                  <Link href={`/app/go-bags/${bag.id}`} className="block h-full">
                    <Card className="h-full p-4 transition-colors hover:border-brand-200">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-center gap-2 font-medium">{bag.kind === "pet" ? <PawPrint className="size-4 text-brand-600" aria-hidden /> : bag.kind === "child" ? <Baby className="size-4 text-brand-600" aria-hidden /> : <Backpack className="size-4 text-brand-600" aria-hidden />}{bag.name}</p>
                        <Badge tone={ready ? "ready" : "warning"}>{ready ? "Pronta" : `${missing} em falta`}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{owner ? `Responsável: ${owner.displayName}` : bag.kind === "pet" ? "Kit do animal" : "Sem responsável"}</p>
                      <ProgressBar value={coverage} className="mt-3" label={`Preparação de ${bag.name}`} />
                      <div className="mt-2 flex justify-between text-xs text-slate-500">
                        <span>{coverage}% preparada</span>
                        <span className={weight.overLimit ? "font-medium text-red-600" : ""}>{formatWeight(weight.totalGrams)}{weight.limitGrams ? ` / ${formatWeight(weight.limitGrams)}` : ""}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Última verificação: {bag.last_checked_at ? formatDate(bag.last_checked_at) : "nunca"}</p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
          {canEdit && (missingAdults > 0 || missingPets > 0 || candidates.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(missingAdults > 0 || missingPets > 0) && <ActionButton variant="secondary" action={createSuggestedBags} input={{}}><Sparkles aria-hidden /> Criar mochilas em falta</ActionButton>}
              {candidates.map((c) => <ActionButton key={c.id} variant="secondary" action={createChildBag} input={{ memberId: c.id }} successMessage="Mochila infantil criada."><Baby aria-hidden /> Mochila leve para {c.displayName}</ActionButton>)}
            </div>
          )}
        </>
      )}
    </>
  );
}
