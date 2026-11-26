import { NextRequest, NextResponse } from "next/server";
import { clearSession, createSession, isAuthenticated, validateAccessCode } from "@/lib/auth";

const attempts = new Map<string, { count: number; until: number }>();

export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const state = attempts.get(ip);
  if (state?.until && state.until > Date.now()) {
    return NextResponse.json({ error: "Access temporarily locked. Try again later." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{4,12}$/.test(code)) {
    return NextResponse.json({ error: "Enter a valid numerical access code." }, { status: 400 });
  }
  let valid: boolean;
  try {
    valid = await validateAccessCode(code);
  } catch (error) {
    console.error("Authentication configuration error:", error);
    return NextResponse.json({ error: "Authentication is not configured on this server." }, { status: 503 });
  }
  if (valid) {
    attempts.delete(ip);
    await createSession();
    return NextResponse.json({ ok: true });
  }
  const next = { count: (state?.count || 0) + 1, until: 0 };
  if (next.count >= 5) next.until = Date.now() + 15 * 60 * 1000;
  attempts.set(ip, next);
  return NextResponse.json({ error: "Access code rejected." }, { status: 401 });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
