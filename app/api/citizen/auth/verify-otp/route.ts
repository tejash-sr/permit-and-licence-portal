import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { frappeGet } from "@/lib/frappe";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { serverError } from "@/lib/auth-helpers";

const OTP_ERROR_MESSAGES: Record<string, string> = {
  expired: "That code expired. Request a new one.",
  invalid: "Incorrect code. Please try again.",
  too_many_attempts: "Too many incorrect attempts. Request a new code.",
  not_found: "No pending code for this ID. Request a new one.",
};

export async function POST(req: NextRequest) {
  try {
    const { emirates_id, otp } = await req.json();
    if (!emirates_id || !otp) {
      return NextResponse.json({ ok: false, error: "Emirates ID and code are required" }, { status: 400 });
    }

    const result = verifyOtp("citizen", emirates_id, otp);
    if (result.status !== "ok") {
      return NextResponse.json({ ok: false, error: OTP_ERROR_MESSAGES[result.status] }, { status: 401 });
    }

    const matches = await frappeGet<{ name: string; full_name: string; email: string }>("Citizen", {
      filters: [["emirates_id", "=", emirates_id]],
      fields: ["name", "full_name", "email"],
      limit: 1,
    });
    const citizen = matches[0];
    if (!citizen) {
      return NextResponse.json({ ok: false, error: "Citizen profile not found. Contact support." }, { status: 404 });
    }

    const token = createSessionToken({
      role: "citizen",
      id: citizen.name,
      name: citizen.full_name,
      email: result.meta?.email || citizen.email || "",
      extra: { emirates_id },
    });

    const res = NextResponse.json({ ok: true, full_name: citizen.full_name });
    setSessionCookie(res, "citizen", token);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
