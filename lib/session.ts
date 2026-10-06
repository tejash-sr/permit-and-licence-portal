import crypto from "crypto";
import { NextResponse } from "next/server";
import { config, type PortalRole } from "./config";

export type SessionPayload = {
  role: PortalRole;
  id: string; // ERPNext user/doc id
  name: string; // display name
  email: string;
  extra?: Record<string, unknown>;
  iat: number;
  exp: number;
};

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

/** Creates a compact, tamper-evident session token: base64url(payload).signature */
export function createSessionToken(data: Omit<SessionPayload, "iat" | "exp">, ttlSeconds = 60 * 60 * 8): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...data, iat: now, exp: now + ttlSeconds };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verifies signature + expiry + expected role. Returns null on any failure — never throws. */
export function verifySessionToken(token: string | undefined | null, expectedRole: PortalRole): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  try {
    const expected = sign(body);
    // constant-time compare
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.role !== expectedRole) return null;
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieNameFor(role: PortalRole): string {
  return config.cookies[role];
}

export function setSessionCookie(res: NextResponse, role: PortalRole, token: string) {
  res.cookies.set(cookieNameFor(role), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie(res: NextResponse, role: PortalRole) {
  res.cookies.set(cookieNameFor(role), "", { path: "/", maxAge: 0 });
}
