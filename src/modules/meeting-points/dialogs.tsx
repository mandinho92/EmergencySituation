"use client";

import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { MeetingPointForm, type MeetingPointData } from "./meeting-point-form";

type Props = { members: Array<{ id: string; display_name: string }>; scenarios: Array<{ key: string; title: string }> };

export function NewMeetingPoint({ kind, label, ...props }: Props & { kind?: MeetingPointData["kind"]; label?: string }) {
  return (
    <FormDialog title="Novo ponto de encontro" trigger={<Button size="sm" variant={label ? "secondary" : "primary"}><Plus aria-hidden /> {label ?? "Adicionar"}</Button>}>
      {(close) => <MeetingPointForm defaultKind={kind} onDone={close} {...props} />}
    </FormDialog>
  );
}

export function EditMeetingPoint({ point, ...props }: Props & { point: MeetingPointData }) {
  return (
    <FormDialog title={point.name} trigger={<Button size="icon" variant="ghost" aria-label={`Editar ${point.name}`}><Pencil aria-hidden /></Button>}>
      {(close) => <MeetingPointForm point={point} onDone={close} {...props} />}
    </FormDialog>
  );
}
