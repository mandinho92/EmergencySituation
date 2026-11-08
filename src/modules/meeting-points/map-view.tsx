"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/misc";
import { useOnline } from "@/modules/offline/connection-status";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <Skeleton className="h-40" /> });

/** Read-only map; offline it shows a note instead of broken tiles. */
export function MapView({ lat, lng }: { lat: number; lng: number }) {
  const online = useOnline();
  if (!online) return <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Mapa indisponível sem Internet. Coordenadas: {lat}, {lng}</p>;
  return <LocationPicker lat={lat} lng={lng} readOnly height={160} />;
}
