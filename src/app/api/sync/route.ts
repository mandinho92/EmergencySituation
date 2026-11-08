import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFamilyContext } from "@/lib/session";
import { applyKitOp, kitOpSchema, type KitOpResult } from "@/modules/kits/ops";

const bodySchema = z.object({ ops: z.array(z.unknown()).min(1).max(100) });

/**
 * Applies a batch of item-state operations (online toggles and offline outbox
 * replays). Operations are applied in order; each reports its own result so
 * the client can drop successful ones and surface failures.
 */
export async function POST(request: Request) {
  const ctx = await getFamilyContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // CSRF defence: only same-origin JSON requests are accepted.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const results: KitOpResult[] = [];
  for (const raw of body.ops) {
    const parsed = kitOpSchema.safeParse(raw);
    const opId = typeof raw === "object" && raw && "opId" in raw ? String((raw as { opId: unknown }).opId) : "unknown";
    if (!parsed.success) {
      results.push({ opId, ok: false, error: "Operação inválida." });
      continue;
    }
    results.push(await applyKitOp(parsed.data, ctx));
  }
  revalidatePath("/app", "layout");
  return NextResponse.json({ results, syncedAt: new Date().toISOString() });
}
