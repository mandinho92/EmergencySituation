import "server-only";
import { serverEnv } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email through Resend's HTTP API when RESEND_API_KEY
 * and EMAIL_FROM are configured. Returns false (without throwing) when email
 * is not configured or delivery fails, so callers can offer a fallback.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  if (!RESEND_API_KEY || !EMAIL_FROM) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email] delivery failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[email] delivery error", e);
    return false;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
