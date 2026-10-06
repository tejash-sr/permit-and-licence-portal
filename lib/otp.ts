// DEV-ONLY in-memory OTP store — works with `next dev` (single process).
// BREAKS on serverless/multi-instance deploy (Vercel). Before deploying, swap
// this for Redis or a Frappe "OTP Log" doctype written via Activepieces.
import { config } from "./config";

type Entry = { otp: string; expiresAt: number; attempts: number; meta?: any };
const store = new Map<string, Entry>();

const MAX_ATTEMPTS = 5;

/** Namespaced key so citizen/officer/admin OTPs never collide even with the same email/id. */
function key(role: string, identifier: string) {
  return `${role}:${identifier}`;
}

export function generateOtp(): string {
  // Fixed demo code so the whole flow is wireable against WireMock without a
  // real SMS/email gateway. Replace with crypto.randomInt(100000, 999999) for prod.
  return config.demoOtp;
}

export function saveOtp(role: string, identifier: string, otp: string, meta?: any) {
  store.set(key(role, identifier), {
    otp,
    expiresAt: Date.now() + config.otpTtlSeconds * 1000,
    attempts: 0,
    meta,
  });
}

export type OtpResult = "ok" | "expired" | "invalid" | "too_many_attempts" | "not_found";

export function verifyOtp(role: string, identifier: string, otp: string): { status: OtpResult, meta?: any } {
  const k = key(role, identifier);
  const entry = store.get(k);
  if (!entry) return { status: "not_found" };
  if (Date.now() > entry.expiresAt) {
    store.delete(k);
    return { status: "expired" };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(k);
    return { status: "too_many_attempts" };
  }
  if (entry.otp !== otp) {
    entry.attempts += 1;
    return { status: "invalid" };
  }
  const meta = entry.meta;
  store.delete(k);
  return { status: "ok", meta };
}
