"use client";

import { Accessibility, HeartPulse, PawPrint, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { ActionButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { formatAge } from "@/i18n/format";
import { MEMBER_CATEGORY_LABEL, PET_SPECIES_LABEL } from "@/i18n/messages";
import type { MemberRow, PetRow } from "@/modules/preparedness/load";
import { applyPreset, deleteMember, deletePet } from "./actions";
import { HealthForm, type HealthRow } from "./health-form";
import { MemberForm } from "./member-form";
import { PetForm } from "./pet-form";

const PRESETS = [
  ["single", "1 pessoa"], ["couple", "2 adultos"], ["couple_1", "2 adultos + 1 criança"], ["couple_2", "2 adultos + 2 crianças"],
  ["couple_3", "2 adultos + 3 crianças"], ["single_parent", "Família monoparental"], ["senior_couple", "Casal sénior"], ["extended", "Família alargada"],
] as const;

export function MembersManager({ members, pets, health, canEdit, canSeeHealth }: { members: MemberRow[]; pets: PetRow[]; health: HealthRow[]; canEdit: boolean; canSeeHealth: boolean }) {
  const adults = members.filter((m) => m.category === "adult" || m.category === "senior");
  const healthBy = new Map(health.map((h) => [h.member_profile_id, h]));
  return (
    <div className="space-y-6">
      <section aria-labelledby="people">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="people" className="text-sm font-semibold text-slate-900">Pessoas ({members.length})</h2>
          {canEdit && (
            <FormDialog title="Adicionar membro" trigger={<Button size="sm"><Plus aria-hidden /> Adicionar membro</Button>}>
              {(close) => <MemberForm adults={adults} onDone={close} />}
            </FormDialog>
          )}
        </div>
        {members.length === 0 ? (
          <div className="space-y-4">
            <EmptyState icon={UserRound} title="Ainda não há membros" description="Escolha uma composição para começar. Pode renomear, adicionar e remover pessoas depois." />
            {canEdit && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map(([key, label]) => (
                  <ActionButton key={key} variant="secondary" action={applyPreset} input={{ preset: key }} className="h-auto py-3 whitespace-normal">{label}</ActionButton>
                ))}
              </div>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => {
              const h = healthBy.get(m.id);
              return (
                <li key={m.id}>
                  <Card className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.display_name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="brand">{MEMBER_CATEGORY_LABEL[m.category]}{m.age_years != null ? ` · ${formatAge(m.age_years)}` : ""}</Badge>
                        {m.reduced_mobility && <Badge tone="warning"><Accessibility aria-hidden /> Mobilidade reduzida</Badge>}
                        {m.uses_diapers && <Badge>Fraldas</Badge>}
                        {m.dietary_needs && <Badge>Dieta: {m.dietary_needs}</Badge>}
                        {m.special_equipment && <Badge>Equipamento especial</Badge>}
                        {canSeeHealth && h && <Badge tone="outline"><HeartPulse aria-hidden /> Dados de saúde</Badge>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <FormDialog title={`Editar ${m.display_name}`} trigger={<Button size="icon" variant="ghost" aria-label={`Editar ${m.display_name}`}><Pencil aria-hidden /></Button>}>
                          {(close) => <MemberForm member={m} adults={adults} onDone={close} />}
                        </FormDialog>
                        {canSeeHealth && (
                          <FormDialog title={`Dados de saúde — ${m.display_name}`} trigger={<Button size="icon" variant="ghost" aria-label={`Dados de saúde de ${m.display_name}`}><HeartPulse aria-hidden /></Button>}>
                            {(close) => <HealthForm memberId={m.id} health={h ?? null} onDone={close} />}
                          </FormDialog>
                        )}
                        <ActionButton size="icon" variant="ghost" aria-label={`Remover ${m.display_name}`} action={deleteMember} input={{ id: m.id }} confirm={`Remover ${m.display_name} do agregado?`} successMessage="Membro removido.">
                          <Trash2 aria-hidden />
                        </ActionButton>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="pets">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="pets" className="text-sm font-semibold text-slate-900">Animais de estimação ({pets.length})</h2>
          {canEdit && (
            <FormDialog title="Adicionar animal" trigger={<Button size="sm" variant="secondary"><Plus aria-hidden /> Adicionar animal</Button>}>
              {(close) => <PetForm onDone={close} />}
            </FormDialog>
          )}
        </div>
        {pets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Sem animais registados. Se tiver animais, adicione-os: entram nos cálculos de água, ração e no kit de evacuação.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pets.map((p) => (
              <li key={p.id}>
                <Card className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="flex items-center gap-2 font-medium"><PawPrint className="size-4 text-brand-600" aria-hidden />{p.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="brand">{PET_SPECIES_LABEL[p.species as keyof typeof PET_SPECIES_LABEL]}{p.quantity > 1 ? ` × ${p.quantity}` : ""}</Badge>
                      {p.approx_weight_kg && <Badge>{p.approx_weight_kg} kg</Badge>}
                      {!p.has_carrier && <Badge tone="warning">Sem transportadora</Badge>}
                      {p.has_microchip && <Badge tone="ready">Microchip</Badge>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <FormDialog title={`Editar ${p.name}`} trigger={<Button size="icon" variant="ghost" aria-label={`Editar ${p.name}`}><Pencil aria-hidden /></Button>}>
                        {(close) => <PetForm pet={p} onDone={close} />}
                      </FormDialog>
                      <ActionButton size="icon" variant="ghost" aria-label={`Remover ${p.name}`} action={deletePet} input={{ id: p.id }} confirm={`Remover ${p.name}?`} successMessage="Animal removido."><Trash2 aria-hidden /></ActionButton>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
