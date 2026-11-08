"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Bottom sheet on mobile, centred dialog on larger screens. */
export function DialogContent({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl data-[state=open]:animate-fade-in",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-base font-semibold text-slate-900">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-slate-500">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X className="size-4" /></D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}

/** Dialog whose open state is controlled locally; children receive close(). */
export function FormDialog({ trigger, title, description, children }: { trigger: React.ReactNode; title: string; description?: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>{children(() => setOpen(false))}</DialogContent>
    </Dialog>
  );
}
