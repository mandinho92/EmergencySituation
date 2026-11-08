"use client";

import { LocateFixed } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/misc";
import { MEETING_POINT_KIND_LABEL } from "@/i18n/messages";
import { deleteMeetingPoint, saveMeetingPoint } from "./actions";
import { useOnline } from "@/modules/offline/connection-status";

const LocationPicker = dynamic(() => import("./location-picker"), { ssr: false, loading: () => <Skeleton className="h-60" /> });

export interface MeetingPointData {
  id: string;
  kind: "near_home" | "out_of_area" | "alternative";
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  access_instructions: string | null;
  scenario_keys: string[];
  responsibles: string[];
}

export function MeetingPointForm({ point, defaultKind, members, scenarios, onDone }: { point?: MeetingPointData; defaultKind?: MeetingPointData["kind"]; members: Array<{ id: string; display_name: string }>; scenarios: Array<{ key: string; title: string }>; onDone?: () => void }) {
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: point?.latitude ?? null, lng: point?.longitude ?? null });
  const online = useOnline();
  return (
    <ActionForm action={saveMeetingPoint} extra={{ id: point?.id ?? "" }} onSuccess={onDone} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="mp-kind"><Select id="mp-kind" name="kind" defaultValue={point?.kind ?? defaultKind ?? "near_home"}>{Object.entries(MEETING_POINT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Nome" htmlFor="mp-name"><Input id="mp-name" name="name" required maxLength={80} defaultValue={point?.name} placeholder="Jardim do bairro" /><FieldError name="name" /></Field>
      </div>
      <Field label="Morada ou referência" htmlFor="mp-address" optional><Input id="mp-address" name="address" maxLength={200} defaultValue={point?.address ?? ""} /></Field>
      <div>
        <p className="mb-1.5 text-sm font-medium">Localização no mapa <span className="font-normal text-slate-400">(opcional — toque no mapa)</span></p>
        {online ? <LocationPicker lat={coords.lat} lng={coords.lng} onChange={(lat, lng) => setCoords({ lat, lng })} /> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">O mapa precisa de Internet. Pode indicar as coordenadas manualmente.</p>}
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Field label="Latitude" htmlFor="mp-lat"><Input id="mp-lat" name="latitude" type="number" step="0.000001" value={coords.lat ?? ""} onChange={(e) => setCoords({ ...coords, lat: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="Longitude" htmlFor="mp-lng"><Input id="mp-lng" name="longitude" type="number" step="0.000001" value={coords.lng ?? ""} onChange={(e) => setCoords({ ...coords, lng: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Button type="button" variant="secondary" size="icon" aria-label="Usar a minha localização atual" onClick={() => {
            if (!navigator.geolocation) return toast.error("Localização indisponível neste dispositivo.");
            navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6 }), () => toast.error("Não foi possível obter a localização."), { enableHighAccuracy: true, timeout: 10000 });
          }}><LocateFixed aria-hidden /></Button>
        </div>
        <FieldError name="latitude" />
      </div>
      <Field label="Descrição" htmlFor="mp-desc" optional><Textarea id="mp-desc" name="description" maxLength={500} defaultValue={point?.description ?? ""} placeholder="Junto ao coreto, do lado da escola." /></Field>
      <Field label="Instruções de acesso" htmlFor="mp-access" optional><Textarea id="mp-access" name="access_instructions" maxLength={500} defaultValue={point?.access_instructions ?? ""} placeholder="A pé pela rua X; evitar a ponte se houver cheia." /></Field>
      {members.length > 0 && (
        <fieldset><legend className="mb-2 text-sm font-medium">Pessoas responsáveis</legend>
          <div className="grid gap-2 sm:grid-cols-2">{members.map((m) => <CheckboxField key={m.id} name="responsibles[]" value={m.id} label={m.display_name} defaultChecked={point?.responsibles.includes(m.id)} />)}</div>
        </fieldset>
      )}
      <fieldset><legend className="mb-2 text-sm font-medium">Cenários em que deve ser usado</legend>
        <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">{scenarios.map((s) => <CheckboxField key={s.key} name="scenario_keys[]" value={s.key} label={s.title} defaultChecked={point?.scenario_keys.includes(s.key)} />)}</div>
      </fieldset>
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        {point && <ActionButton variant="ghost" action={deleteMeetingPoint} input={{ id: point.id }} confirm="Remover este ponto de encontro?" successMessage="Removido." onDone={onDone}>Remover</ActionButton>}
      </div>
    </ActionForm>
  );
}
