import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/ui/misc";
import { hasRole, requireFamily } from "@/lib/session";
import { HouseholdForm } from "@/modules/household/household-form";
import { loadPreparedness } from "@/modules/preparedness/load";

export const metadata: Metadata = { title: "Habitação" };

export default async function HouseholdPage() {
  const ctx = await requireFamily();
  const data = await loadPreparedness(ctx.family.id);
  return (
    <>
      <PageHeader icon={Building2} title="Habitação e localização" description="Influencia o HOME KIT (cozinha, incêndio, proteção) e os riscos destacados nos cenários." />
      {hasRole(ctx.role, "editor") ? (
        <Card className="p-5"><HouseholdForm household={data.household} /></Card>
      ) : (
        <Notice>Apenas editores e administradores podem alterar a habitação.</Notice>
      )}
    </>
  );
}
