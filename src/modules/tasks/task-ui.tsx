"use client";

import { Plus, Trash2 } from "lucide-react";
import { ActionButton, ActionForm, FieldError, SubmitButton } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { formatDate } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { deleteTask, saveTask, setTaskDone } from "./actions";

export interface TaskRow { id: string; title: string; description: string | null; assignee_user_id: string | null; due_on: string | null; status: string; completed_at: string | null; completed_by: string | null; created_by: string | null }

export function TaskDialog({ accounts, suggestion }: { accounts: Array<{ id: string; name: string }>; suggestion?: string }) {
  return (
    <FormDialog title="Nova tarefa" trigger={<Button size="sm"><Plus aria-hidden /> {suggestion ? "Criar tarefa" : "Nova tarefa"}</Button>}>
      {(close) => (
        <ActionForm action={saveTask} onSuccess={close} resetOnSuccess className="space-y-4">
          <Field label="Tarefa" htmlFor="t-title"><Input id="t-title" name="title" required maxLength={140} defaultValue={suggestion} /><FieldError name="title" /></Field>
          <Field label="Descrição" htmlFor="t-desc" optional><Textarea id="t-desc" name="description" maxLength={1000} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsável" htmlFor="t-who"><Select id="t-who" name="assignee_user_id" defaultValue=""><option value="">— Ninguém —</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Prazo" htmlFor="t-due" optional><Input id="t-due" name="due_on" type="date" /></Field>
          </div>
          <SubmitButton>Criar</SubmitButton>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function TaskItem({ task, names, canDelete }: { task: TaskRow; names: Record<string, string>; canDelete: boolean }) {
  const overdue = task.status === "open" && task.due_on && task.due_on < new Date().toISOString().slice(0, 10);
  return (
    <li className="flex items-start gap-3 py-3">
      <ActionButton size="icon" variant="ghost" aria-label={task.status === "done" ? "Reabrir tarefa" : "Concluir tarefa"} action={setTaskDone} input={{ id: task.id, done: task.status !== "done" }}>
        <span className={cn("size-5 rounded-full border-2", task.status === "done" ? "border-ready-500 bg-ready-500" : "border-slate-300")} aria-hidden />
      </ActionButton>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", task.status === "done" && "text-slate-400 line-through")}>{task.title}</p>
        {task.description && <p className="text-sm text-slate-500">{task.description}</p>}
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {task.assignee_user_id && <Badge tone="brand">{names[task.assignee_user_id] ?? "—"}</Badge>}
          {task.due_on && <Badge tone={overdue ? "danger" : "neutral"}>{overdue ? "Atrasada · " : ""}{formatDate(task.due_on)}</Badge>}
          {task.status === "done" && task.completed_by && <span className="text-slate-500">Concluída por {names[task.completed_by] ?? "—"} em {formatDate(task.completed_at)}</span>}
        </div>
      </div>
      {canDelete && <ActionButton size="icon" variant="ghost" aria-label="Remover tarefa" action={deleteTask} input={{ id: task.id }} confirm="Remover esta tarefa?"><Trash2 aria-hidden /></ActionButton>}
    </li>
  );
}
