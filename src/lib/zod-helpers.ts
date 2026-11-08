import { z } from "zod";

/** Form helpers: empty strings become null; "on"/"true" become booleans. */
export const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v), z.string().max(max, `Máximo ${max} caracteres`).nullable().optional())
    .transform((v) => v ?? null);

export const requiredText = (max: number, message = "Campo obrigatório") =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string({ error: message }).min(1, message).max(max, `Máximo ${max} caracteres`));

export const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

export const optionalNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : typeof v === "string" ? Number(v.replace(",", ".")) : v),
    z.number({ error: "Número inválido" }).min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`).nullable());

export const requiredNumber = (min: number, max: number) =>
  z.preprocess((v) => (typeof v === "string" ? Number(v.replace(",", ".")) : v), z.number({ error: "Número inválido" }).min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`));

export const optionalDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").nullable());

export const uuid = z.string().uuid();
export const optionalUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable());

export const stringArray = z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(z.string()));
