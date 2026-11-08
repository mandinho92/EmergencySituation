"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Uses the browser's print dialog, which also offers "Save as PDF". Works offline. */
export function PrintButton({ label = "Imprimir / Guardar PDF" }: { label?: string }) {
  return <Button size="sm" onClick={() => window.print()} className="no-print"><Printer aria-hidden /> {label}</Button>;
}
