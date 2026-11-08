"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { BudgetForm } from "@/modules/home-kit/preferences-form";

export function BudgetDialog({ budgetCents }: { budgetCents: number | null }) {
  return (
    <FormDialog title="Orçamento" trigger={<Button size="sm" variant="secondary"><Wallet aria-hidden /> Orçamento</Button>}>
      {(close) => <BudgetForm budgetCents={budgetCents} onDone={close} />}
    </FormDialog>
  );
}
