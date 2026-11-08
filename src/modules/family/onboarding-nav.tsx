"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setOnboardingStep } from "./actions";

type Step = "members" | "household" | "preferences" | "done";

export function OnboardingNav({ next, skippable = true, label = "Continuar" }: { next: Step; skippable?: boolean; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = () =>
    start(async () => {
      await setOnboardingStep({ step: next });
      router.push(next === "done" ? "/app?welcome=1" : `/onboarding?step=${next}`);
    });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
      {skippable ? <Button variant="ghost" onClick={go} disabled={pending}>Saltar por agora</Button> : <span />}
      <Button onClick={go} disabled={pending}>{label} <ArrowRight aria-hidden /></Button>
    </div>
  );
}
