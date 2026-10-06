import { NextRequest, NextResponse } from "next/server";

declare global {
  var __rateLimits: Map<string, { count: number, resetAt: number }> | undefined;
}
import { verifyCitizenWithGovApi, sendOtpViaGateway } from "@/lib/wiremock";
import { generateOtp, saveOtp } from "@/lib/otp";
import { frappeGet, frappeCreate } from "@/lib/frappe";
import { serverError } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { emirates_id, phone } = await req.json();
    if (!emirates_id || !phone) {
      return NextResponse.json({ ok: false, error: "Emirates ID and phone are required" }, { status: 400 });
    }

    /* Rate limiting disabled for dev
    const rateLimitKey = `rl:${emirates_id}:${phone}`;
    const now = Date.now();
    const limits = global.__rateLimits || (global.__rateLimits = new Map<string, { count: number, resetAt: number }>());
    let rateData = limits.get(rateLimitKey);
    if (!rateData || now > rateData.resetAt) {
      rateData = { count: 0, resetAt: now + 15 * 60 * 1000 };
    }
    rateData.count += 1;
    limits.set(rateLimitKey, rateData);
    if (rateData.count > 5) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please wait 15 minutes." }, { status: 429 });
    }
    */

    // 1. Government registry check (WireMock). If the ID isn't present, login
    //    is refused outright — there is no self-signup fallback.
    const ica = await verifyCitizenWithGovApi(emirates_id, phone);
    if (ica.status === 0) {
      return NextResponse.json(
        { ok: false, error: "Government verification service is unreachable. Try again shortly." },
        { status: 503 }
      );
    }
    if (!ica.ok || !ica.data?.verified) {
      return NextResponse.json(
        { ok: false, error: "No matching Emirates ID + phone found with the government registry." },
        { status: 404 }
      );
    }
    if (ica.data.id_status && ica.data.id_status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: `Emirates ID status is ${ica.data.id_status}, not ACTIVE.` }, { status: 403 });
    }
    if (ica.data.card_expiry_date && new Date(ica.data.card_expiry_date) < new Date()) {
      return NextResponse.json({ ok: false, error: "Your Emirates ID has expired. Please renew before applying." }, { status: 403 });
    }

    // 2. First-login provisioning: create the Citizen in ERPNext if it
    //    doesn't exist yet (auth itself never depends on the Citizen doctype).
    const existing = await frappeGet<{ name: string; full_name: string; email: string; gender: string }>("Citizen", {
      filters: [["emirates_id", "=", emirates_id]],
      fields: ["name", "full_name", "email", "gender"],
      limit: 1,
    });

    let citizen = existing[0];
    if (!citizen) {
      citizen = await frappeCreate("Citizen", {
        emirates_id,
        phone,
        email: ica.data.email,
        full_name: ica.data.full_name ?? "Citizen",
        nationality: ica.data.nationality,
        date_of_birth: ica.data.date_of_birth,
        gender: ica.data.gender,
        card_expiry_date: ica.data.card_expiry_date,
      });
    }

    // 3. OTP (demo code, see lib/otp.ts) — namespaced under "citizen" so it
    //    can never collide with an officer/admin OTP for the same identifier.
    const otp = generateOtp();
    saveOtp("citizen", emirates_id, otp, { full_name: citizen.full_name, email: citizen.email || ica.data.email });
    await sendOtpViaGateway(citizen.email || ica.data.email || phone, otp);

    return NextResponse.json({
      ok: true,
      masked_destination: phone.replace(/.(?=.{2})/g, "•"),
    });
  } catch (err) {
    return serverError(err);
  }
}
