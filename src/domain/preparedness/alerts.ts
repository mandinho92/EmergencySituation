/**
 * Maintenance alerts derived from stored items (no scheduler required):
 * expiries, recharge/maintenance due, incomplete or unchecked bags, reviews.
 */

export type AlertKind =
  | "expired"
  | "expiring"
  | "needs_recharge"
  | "maintenance_due"
  | "bag_not_checked"
  | "review_due";

export interface Alert {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  href: string;
  severity: "high" | "medium" | "low";
  dueOn?: string;
}

export interface ExpiringThing {
  id: string;
  name: string;
  expiresOn: string | null;
  href: string;
  /** Medication and water are flagged with higher severity. */
  sensitive?: boolean;
}

export interface MaintainableThing {
  id: string;
  name: string;
  condition: string;
  maintenanceIntervalDays: number | null;
  lastMaintainedOn: string | null;
  href: string;
}

export const EXPIRY_WARNING_DAYS = 30;
export const BAG_CHECK_INTERVAL_DAYS = 90;

const DAY = 86_400_000;

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  const today = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((from - today) / DAY);
}

export function computeAlerts(
  input: {
    expiring: ExpiringThing[];
    maintainable: MaintainableThing[];
    bags: Array<{ id: string; name: string; lastCheckedAt: string | null; createdAt: string }>;
    reviews: Array<{ id: string; title: string; dueOn: string }>;
  },
  now: Date = new Date(),
): Alert[] {
  const alerts: Alert[] = [];

  for (const e of input.expiring) {
    if (!e.expiresOn) continue;
    const d = daysBetween(e.expiresOn, now);
    if (d < 0) {
      alerts.push({ id: `exp:${e.id}`, kind: "expired", title: `${e.name} expirou`, detail: `Validade: ${e.expiresOn}`, href: e.href, severity: "high", dueOn: e.expiresOn });
    } else if (d <= EXPIRY_WARNING_DAYS) {
      alerts.push({ id: `exp:${e.id}`, kind: "expiring", title: `${e.name} expira em ${d} dia(s)`, detail: `Validade: ${e.expiresOn}`, href: e.href, severity: e.sensitive ? "high" : "medium", dueOn: e.expiresOn });
    }
  }

  for (const m of input.maintainable) {
    if (m.condition === "needs_recharge") {
      alerts.push({ id: `rec:${m.id}`, kind: "needs_recharge", title: `Recarregar: ${m.name}`, detail: "Marcado como a precisar de carga", href: m.href, severity: "medium" });
    } else if (m.condition === "needs_maintenance" || m.condition === "damaged") {
      alerts.push({ id: `mnt:${m.id}`, kind: "maintenance_due", title: `Manutenção: ${m.name}`, detail: m.condition === "damaged" ? "Marcado como danificado" : "Marcado como a precisar de manutenção", href: m.href, severity: "medium" });
    } else if (m.maintenanceIntervalDays && m.lastMaintainedOn) {
      const due = new Date(new Date(`${m.lastMaintainedOn}T00:00:00Z`).getTime() + m.maintenanceIntervalDays * DAY);
      const d = daysBetween(due.toISOString(), now);
      if (d <= 7) {
        alerts.push({ id: `mnt:${m.id}`, kind: "maintenance_due", title: `Verificar/recarregar: ${m.name}`, detail: d < 0 ? `Atrasado ${-d} dia(s)` : `Em ${d} dia(s)`, href: m.href, severity: d < 0 ? "medium" : "low", dueOn: due.toISOString().slice(0, 10) });
      }
    }
  }

  for (const b of input.bags) {
    const ref = b.lastCheckedAt ?? b.createdAt;
    const age = -daysBetween(ref, now);
    if (age >= BAG_CHECK_INTERVAL_DAYS) {
      alerts.push({ id: `bag:${b.id}`, kind: "bag_not_checked", title: `Verificar: ${b.name}`, detail: b.lastCheckedAt ? `Última verificação há ${age} dias` : "Ainda não foi verificada", href: `/app/go-bags/${b.id}`, severity: "low" });
    }
  }

  for (const r of input.reviews) {
    const d = daysBetween(r.dueOn, now);
    if (d <= 7) {
      alerts.push({ id: `rev:${r.id}`, kind: "review_due", title: r.title, detail: d < 0 ? `Em atraso desde ${r.dueOn}` : `Prevista para ${r.dueOn}`, href: "/app/reviews", severity: d < 0 ? "medium" : "low", dueOn: r.dueOn });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || (a.dueOn ?? "").localeCompare(b.dueOn ?? ""));
}
