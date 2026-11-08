"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

type Action = (input: Record<string, unknown>) => Promise<ActionResult<unknown>>;

const FieldErrorsContext = React.createContext<Record<string, string>>({});
export const useFieldError = (name: string) => React.useContext(FieldErrorsContext)[name];

/** Converts FormData into a plain object; keys ending in [] become arrays. */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const value = typeof v === "string" ? v : v.name;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      out[key] = [...((out[key] as string[]) ?? []), value];
    } else out[k] = value;
  }
  return out;
}

/**
 * Form bound to a server action. Shows a toast on success/failure, exposes
 * field errors to <FieldError>, and is disabled while offline (server writes
 * need connectivity; checklists use the offline outbox instead).
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage = "Guardado.",
  onSuccess,
  resetOnSuccess = false,
  extra,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  successMessage?: string | null;
  onSuccess?: (result: ActionResult<unknown>) => void;
  resetOnSuccess?: boolean;
  extra?: Record<string, unknown>;
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function submit(fd: FormData) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Sem ligação. Esta alteração precisa de Internet.");
      return;
    }
    let result: ActionResult<unknown>;
    try {
      result = await action({ ...formDataToObject(fd), ...extra });
    } catch {
      toast.error("Não foi possível contactar o servidor.");
      return;
    }
    if (result.ok) {
      setErrors({});
      const msg = result.message ?? successMessage;
      if (msg) toast.success(msg);
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(result);
      router.refresh();
    } else {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
    }
  }

  return (
    <FieldErrorsContext.Provider value={errors}>
      <form ref={formRef} action={submit} className={className} noValidate={false}>
        {children}
      </form>
    </FieldErrorsContext.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return <p className="text-xs text-red-600" role="alert">{error}</p>;
}

export function SubmitButton({ children, className, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} className={cn(className)} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** One-click action button with optional confirmation. */
export function ActionButton({
  action,
  input,
  children,
  confirm,
  successMessage = null,
  onDone,
  ...props
}: Omit<ButtonProps, "onClick"> & {
  action: Action;
  input: Record<string, unknown>;
  confirm?: string;
  successMessage?: string | null;
  onDone?: (result: ActionResult<unknown>) => void;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        if (!navigator.onLine) {
          toast.error("Sem ligação. Esta alteração precisa de Internet.");
          return;
        }
        start(async () => {
          try {
            const r = await action(input);
            if (r.ok) {
              const msg = r.message ?? successMessage;
              if (msg) toast.success(msg);
              router.refresh();
            } else toast.error(r.error);
            onDone?.(r);
          } catch {
            toast.error("Não foi possível contactar o servidor.");
          }
        });
      }}
      {...props}
    >
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
