"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fr-only-missing";

/**
 * Wraps a kit list: "Só o que falta" toggle (persisted on the device) that
 * hides completed rows via CSS, and opens a collapsed category when its
 * anchor is targeted (category chips, dashboard links).
 */
export function KitList({ children, completeCount }: { children: React.ReactNode; completeCount: number }) {
  const [onlyMissing, setOnlyMissing] = useState(false);

  useEffect(() => {
    try {
      // Restore the saved preference after hydration (localStorage is not available on the server).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOnlyMissing(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* private mode */
    }
    const openTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    openTarget();
    window.addEventListener("hashchange", openTarget);
    return () => window.removeEventListener("hashchange", openTarget);
  }, []);

  function toggle() {
    const next = !onlyMissing;
    setOnlyMissing(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* private mode */
    }
  }

  return (
    <div data-only-missing={onlyMissing}>
      <label className="mb-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-4 py-2 ring-1 ring-slate-200 no-print">
        <span className="text-sm font-medium">Mostrar só o que falta{completeCount > 0 && <span className="ml-1 font-normal text-slate-500">({completeCount} completos)</span>}</span>
        <span className={cn("relative h-7 w-12 rounded-full transition-colors", onlyMissing ? "bg-ready-600" : "bg-slate-300")}>
          <input type="checkbox" className="sr-only" checked={onlyMissing} onChange={toggle} />
          <span className={cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform", onlyMissing && "translate-x-5")} />
        </span>
      </label>
      <p className="mb-3 px-1 text-xs text-slate-500 sm:hidden no-print">Toque no círculo quando já tiver o artigo. Use − e + para quantidades parciais.</p>
      {children}
    </div>
  );
}
