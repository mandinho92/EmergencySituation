import { Backpack, House } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Segmented switch between the two independent kits. */
export function KitTabs({ active }: { active: "home" | "bags" }) {
  const tab = (key: "home" | "bags", href: string, label: string, Icon: typeof House) => (
    <Link href={href} aria-current={active === key ? "page" : undefined} className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold", active === key ? "bg-white text-brand-800 shadow-sm" : "text-slate-500")}>
      <Icon className="size-4" aria-hidden /> {label}
    </Link>
  );
  return (
    <nav aria-label="Kits" className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1 sm:max-w-sm no-print">
      {tab("home", "/app/home-kit", "Ficar em casa", House)}
      {tab("bags", "/app/go-bags", "Evacuar", Backpack)}
    </nav>
  );
}
