"use client";

import { Check, ChevronDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { signOut } from "@/modules/auth/actions";
import { switchFamily } from "@/modules/family/actions";
import { clearPrivateCache } from "@/modules/offline/sw-registration";

export function UserMenu({ name, families, activeFamilyId }: { name: string; families: Array<{ id: string; name: string }>; activeFamilyId: string }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-slate-100" aria-label="Menu da conta">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">{initials}</span>
        <ChevronDown className="size-3.5 text-slate-500" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-56 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg">
          <DropdownMenu.Label className="px-2.5 py-2 text-xs text-slate-500">{name}</DropdownMenu.Label>
          {families.length > 1 && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
              <DropdownMenu.Label className="px-2.5 py-1 text-xs font-semibold text-slate-400 uppercase">Famílias</DropdownMenu.Label>
              {families.map((f) => (
                <DropdownMenu.Item key={f.id} onSelect={() => switchFamily({ familyId: f.id })} className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 outline-none data-highlighted:bg-slate-100">
                  {f.name} {f.id === activeFamilyId && <Check className="size-4 text-brand-600" aria-hidden />}
                </DropdownMenu.Item>
              ))}
            </>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item asChild className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 outline-none data-highlighted:bg-slate-100">
            <Link href="/app/settings"><Settings className="size-4" aria-hidden /> Definições</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={async () => {
              await clearPrivateCache();
              await signOut({});
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-red-700 outline-none data-highlighted:bg-red-50"
          >
            <LogOut className="size-4" aria-hidden /> Terminar sessão
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
