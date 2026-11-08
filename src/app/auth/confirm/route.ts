import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE } from "@/modules/auth/constants";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "email_change"];

function safeNext(value: string | undefined | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

/**
 * Magic-link landing. Supports both the token_hash template (recommended,
 * works across devices) and the PKCE `code` flow of the default template.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
    if (error) console.warn("[auth] verifyOtp failed", error.status, error.code);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.warn("[auth] exchangeCodeForSession failed", error.status, error.code);
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=link", url.origin));
  }
  const store = await cookies();
  const next = safeNext(store.get(NEXT_COOKIE)?.value ?? url.searchParams.get("next"));
  store.delete(NEXT_COOKIE);
  return NextResponse.redirect(new URL(next, url.origin));
}
