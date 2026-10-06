import { NextRequest, NextResponse } from "next/server";
import { cookieNameFor, verifySessionToken, type SessionPayload } from "./session";
import type { PortalRole } from "./config";

/**
 * Reads + verifies the session cookie for a given role directly off the
 * request. Returns null (never throws) if missing/invalid/expired — callers
 * decide whether that's a 401 or a redirect.
 */
export function getSession(req: NextRequest, role: PortalRole): SessionPayload | null {
  const token = req.cookies.get(cookieNameFor(role))?.value;
  return verifySessionToken(token, role);
}

/** Standard 401 JSON shape used across all three portals' API routes. */
export function unauthorized(message = "Not signed in") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

/** Standard 500 JSON shape — keeps error messages consistent + debuggable. */
export function serverError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[API error]", message);
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
